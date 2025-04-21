import re
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer  # For normalized TF
from scipy.sparse import save_npz  # To save the sparse matrix
import os

# Helper function to remove special characters (only keeps alphanumerics and whitespace)
def clean_text(text):
    return re.sub(r'[^A-Za-z0-9\s]', '', text)

# -------------------------------
# Step 1: Process original CSV to build bag_of_words
# -------------------------------
# Read the original CSV file (imdb_movies_all.csv)
df_orig = pd.read_csv('imdb_movies_all.csv')

# Remove any double quotes from the title column.
df_orig['title'] = df_orig['title'].astype(str).str.replace('"', '')

# Process actor names: if string then split by comma, then clean each name, lower case, and strip.
df_orig['actor_names'] = df_orig['actor_names'].apply(
    lambda x: [clean_text(actor).lower().strip() for actor in x.split(',')] if isinstance(x, str) else []
)

# Process genres: if string then split by comma, then lower case and strip.
df_orig['genres'] = df_orig['genres'].apply(
    lambda x: [genre.lower().strip() for genre in x.split(',')] if isinstance(x, str) else []
)

# Process director names: if string then split by space, then clean each name, lower case, and strip.
df_orig['director_names'] = df_orig['director_names'].apply(
    lambda x: [clean_text(director).lower().strip() for director in x.split(' ')] if isinstance(x, str) else []
)

# Clean the plot text: remove '/' and then remove any special characters.
df_orig['plot'] = df_orig['plot'].apply(
    lambda x: clean_text(x.replace('/', '')) if isinstance(x, str) else x
)

# -------------------------------
# Extract Keywords using RAKE on plot
# -------------------------------
import rake_nltk
from rake_nltk import Rake
import nltk
nltk.download('stopwords')
nltk.download('punkt_tab')

# Initialize the 'Key_words' column with empty lists
df_orig['Key_words'] = [[] for _ in range(len(df_orig))]
for idx, row in df_orig.iterrows():
    plot = row['plot']
    r = Rake()  # Uses default stopwords and punctuation handling
    r.extract_keywords_from_text(plot)
    key_words_dict_scores = r.get_word_degrees()
    df_orig.at[idx, 'Key_words'] = list(key_words_dict_scores.keys())

# -------------------------------
# Create bag_of_words by concatenating only specific columns if they are present
# -------------------------------
def join_row(row):
    columns_to_include = ['title', 'genres', 'director_names', 'actor_names', 'plot']
    items = []
    for col in columns_to_include:
        value = row[col]
        if isinstance(value, (list, np.ndarray)):
            if len(value) > 0:
                items.append(' '.join(map(str, value)))
        else:
            if pd.notnull(value) and str(value).strip():
                items.append(str(value))
    return ' '.join(items)

df_orig['bag_of_words'] = df_orig.apply(join_row, axis=1)

# Keep only the 'title' and 'bag_of_words' columns
df_bow = df_orig[['title', 'bag_of_words']]

# -------------------------------
# Step 2: Save / Update bag_of_words CSV
# -------------------------------
csv_filename = 'bag_of_words.csv'
if os.path.exists(csv_filename):
    existing = pd.read_csv(csv_filename)
    new_rows = df_bow[~df_bow['title'].isin(existing['title'])]
    if not new_rows.empty:
        updated = pd.concat([existing, new_rows], ignore_index=True)
        updated.to_csv(csv_filename, index=False)
    else:
        updated = existing
else:
    df_bow.to_csv(csv_filename, index=False)
    updated = df_bow

# -------------------------------
# Step 3: Load bag_of_words CSV and create normalized TF matrix
# -------------------------------
df_new = pd.read_csv(csv_filename)
vectorizer = TfidfVectorizer(use_idf=False, norm='l2', max_features=10000)
tf_normalized = vectorizer.fit_transform(df_new['bag_of_words'])
save_npz('normalized_tf.npz', tf_normalized)
