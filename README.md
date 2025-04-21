# 🎬 UniRise – Movie & Series Recommendation System

A content-based recommendation system for movies and TV series using **machine learning**, **natural language processing**, and **modern web technologies**. The system provides **personalized suggestions** based on movie metadata and user preferences.

---

## 🚀 Features

- 🔍 **Search and Discover** movies and series from a curated IMDb dataset  
- 🧠 **Content-Based Filtering** using TF-IDF & Cosine Similarity  
- 📊 **Evaluation Metrics**: Precision, Recall, F1 Score, MAP, NDCG, MRR  
- 🔐 **User Authentication** with Firebase (OAuth 2.0)  
- 🎨 **Interactive UI** built with React.js & Redux  
- ⚙️ **Scalable Backend** using Node.js & Express.js  
- 📦 **Efficient Data Storage** in `.npz` and `.csv` formats  
- 🤖 **Support for Hybrid & Future Deep Learning Models**  
- 🌍 **AR/UX Ready** for future integration with spatial visualizations  

---

## 🛠️ Tech Stack

### Frontend
- React.js  
- Redux  
- Tailwind CSS  

### Backend
- Node.js  
- Express.js  
- Firebase Authentication  

### Machine Learning
- Python  
- Scikit-learn  
- Pandas  
- NumPy  

### Tools & APIs
- TMDb API  
- Puppeteer (Web Scraping)  
- Postman (API Testing)  

---

## 📁 Project Structure

```bash
📦 root
 ┣ 📂client/              # React frontend
 ┣ 📂server/              # Node.js backend
 ┣ 📂recommendation/      # Python-based ML models
 ┣ 📂data/                # Movie metadata (CSV/NPZ files)
 ┣ 📂scripts/             # Web scraping and preprocessing
 ┣ 📄README.md            # Project overview
 ┣ 📄.env.example         # Environment variable template
 ┗ 📄.gitignore           # Ignored files
```

---

## 📊 Model Overview

**TF-IDF Vectorization on:**
- 🎞️ Title  
- 🧬 Genres  
- 📚 Plot summaries  
- 🎭 Actors/Directors  

**Similarity Calculation:**
- 🔁 Cosine Similarity used to match user preferences with movie vectors  

**Evaluation:**
- 🧪 Tested with synthetic and real user feedback data  

---

## 🧪 Evaluation Results

| Metric         | Score |
|----------------|-------|
| 🎯 Precision @10 | **0.85** |
| 🔍 Recall @10    | **0.78** |
| ⚖️ F1 Score      | **0.81** |
| 📈 MAP           | **0.76** |
| 📊 NDCG          | **0.82** |
| 🔁 MRR           | **0.79** |

---

## 🧠 Future Improvements

- ✅ **Hybrid Filtering** (Collaborative + Content-Based)  
- 🤖 **Deep Learning**: BERT, Word2Vec, GNN  
- 📲 **AR Integration**: Augmented Reality interfaces  
- 🎯 **Reinforcement Learning** for real-time feedback  

---

## 🧪 API Endpoints

| Method | Route              | Description                        |
|--------|--------------------|------------------------------------|
| GET    | `/api/recommend`   | Returns recommendations            |
| POST   | `/api/rate`        | Submits rating/feedback            |
| GET    | `/api/movie/:id`   | Returns movie metadata             |
| GET    | `/api/search?q=`   | Search movies or series            |

---

## 📁 Getting Started

### 🔧 Prerequisites

- Install [Node.js](https://nodejs.org/) (v16 or higher)
- Install [Python 3.8+](https://www.python.org/downloads/)
- Create a [Firebase Project](https://firebase.google.com/)
- Generate a [TMDb API Key](https://www.themoviedb.org/documentation/api)

---

### ⚙️ Installation & Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-username/unirse-movie-recommendation.git
cd unirse-movie-recommendation

# 2. Install Node.js dependencies
npm install

# 3. Set up Python environment
cd recommendation
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 4. Create and configure .env file
cp .env.example .env
# Fill in your Firebase and TMDb credentials

# 5. Run the IMDb Scraper to gather movie data
cd ../scripts
node imdb_scrapper.js

# 6. Preprocess data and generate vector representations
cd ../recommendation
python imdb_text_vectorizer.py

# This generates:
# - data/bag_of_words.csv
# - data/normalized_tf.npz

# 7. Start the backend server to serve recommendations
cd ../server
node server.js
```

---

### 💡 Additional Setup (Windows)

#### ✅ Node.js Verification

After installing Node.js, run the following to verify installation:

```bash
node -v
```

Then start the backend server:

```bash
node server.js
```

#### ✅ PowerShell Execution Policy

1. Open PowerShell as **Administrator** and run:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Type `[A]` (Yes to All) when prompted.

2. In a new terminal, start the frontend development server:

```bash
npx vite
```

---

## 🌐 Environment Variables

Edit `.env` with your API keys:

```env
PORT=5000

# Firebase Config
FIREBASE_API_KEY=your_firebase_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_messaging_id
FIREBASE_APP_ID=your_app_id

# TMDb Auth
TMDB_AUTH_TOKEN=Bearer your_tmdb_auth_token
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## ✨ Contributors

Developed by [@OmarAlhaz](https://github.com/OmarAlhaz) and open for community contributions. Feel free to submit issues and PRs 🚀
