import sys
import json
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from scipy.sparse import load_npz
import os

# File paths
BOW_FILE = 'bag_of_words.csv'
NPZ_FILE = 'normalized_tf.npz'

# Load bag_of_words CSV exactly as in test.py
df = pd.read_csv(BOW_FILE)
# Load the pre-computed normalized TF matrix
tf_normalized = load_npz(NPZ_FILE)
# Create a Series for movie titles
indices = pd.Series(df['title'])

def get_recommendations(movie_title, topN=50):
    try:
        idx = indices[indices == movie_title].index[0]
    except Exception as e:
        sys.stderr.write(f"Movie '{movie_title}' not found in dataset.\n")
        return []  # Movie not found.
    
    sim_scores = cosine_similarity(tf_normalized[idx], tf_normalized).flatten()
    score_series = pd.Series(sim_scores).sort_values(ascending=False)
    # Get indices of the top N most similar movies (skip the movie itself)
    top_indexes = list(score_series.iloc[1:topN+1].index)
    rec_movies = df['title'].iloc[top_indexes].tolist()
    return rec_movies

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("[]")
        sys.exit(0)
    movie_title = sys.argv[1]
    recommendations = get_recommendations(movie_title)
    # Only output JSON to stdout.
    print(json.dumps(recommendations))
