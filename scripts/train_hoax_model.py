import pandas as pd
import numpy as np
import os
import pickle
import re
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
import xgboost as xgb
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, accuracy_score

# Configuration
REAL_NEWS_FILES = [
    'data/Cleaned_Antaranews_v1.csv',
    'data/Cleaned_Detik_v2.csv',
    'data/Cleaned_Kompas_v2.csv',
    'data/antaranews_cleaned_v3.csv',
    'data/detik_cleaned_v3.csv',
    'data/kompas_cleaned_v3.csv'
]
HOAX_NEWS_FILES = [
    'data/Cleaned_TurnBackHoax_v3.csv',
    'data/komdigi_hoaks.csv',
    'data/tbh_cleaned_v3.csv',
    'data/komdigi_hoaks_tambahan.csv'
]
MODEL_DIR = 'model'

def load_and_label(files, label, label_name):
    dfs = []
    for f in files:
        if os.path.exists(f):
            try:
                df = pd.read_csv(f, nrows=25000)
                
                text_col = None
                possible_cols = ['body_text', 'content', 'isi', 'full_text', 'text', 'body']
                for col in possible_cols:
                    if col in df.columns:
                        text_col = col
                        break
                
                if 'title' in df.columns:
                    titles = df['title'].astype(str)
                elif 'judul' in df.columns:
                    titles = df['judul'].astype(str)
                else:
                    titles = pd.Series([""] * len(df))
                    
                if text_col:
                    bodies = df[text_col].astype(str)
                else:
                    bodies = pd.Series([""] * len(df))
                
                temp_df = pd.DataFrame({'text': titles + " " + bodies})
                temp_df['label'] = label
                dfs.append(temp_df)
                print(f"Loaded {f}: combined title and text")
            except Exception as e:
                print(f"Error loading {f}: {e}")
        else:
            print(f"File not found: {f}")
    
    if not dfs:
        return pd.DataFrame()
    return pd.concat(dfs, ignore_index=True)

def clean_text(text):
    text = str(text).lower()
    text = re.sub(r'[^\w\s\.,!?]', '', text) 
    return text

def main():
    print("Loading Real News...")
    df_real = load_and_label(REAL_NEWS_FILES, 0, "Real")
    
    print("Loading Hoax News...")
    df_hoax = load_and_label(HOAX_NEWS_FILES, 1, "Hoax")
    
    if df_real.empty or df_hoax.empty:
        print("Error: Insufficient data to train.")
        return

    print(f"Real samples: {len(df_real)}, Hoax samples: {len(df_hoax)}")
    
    if len(df_real) > 25000: df_real = df_real.sample(25000, random_state=42)
    if len(df_hoax) > 25000: df_hoax = df_hoax.sample(25000, random_state=42)

    df_full = pd.concat([df_real, df_hoax], ignore_index=True)
    print("Cleaning text...")
    df_full['text'] = df_full['text'].apply(clean_text)
    
    X = df_full['text']
    y = df_full['label']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.15, random_state=42, stratify=y)
    
    print("Training XGBoost Model for Pattern Recognition...")
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(max_features=25000, ngram_range=(1,3))),
        ('clf', xgb.XGBClassifier(
            n_estimators=300, 
            max_depth=6, 
            learning_rate=0.1, 
            subsample=0.8,
            random_state=42, 
            n_jobs=-1
        ))
    ])
    
    pipeline.fit(X_train, y_train)
    
    y_pred = pipeline.predict(X_test)
    print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
    print(classification_report(y_test, y_pred, target_names=['Real', 'Hoax']))
    
    if not os.path.exists(MODEL_DIR):
        os.makedirs(MODEL_DIR)
        
    model_path = os.path.join(MODEL_DIR, 'hoax_model.pkl')
    with open(model_path, 'wb') as f:
        pickle.dump(pipeline, f)
        
    print(f"Model XGBoost Smarter-Pattern saved to {model_path}")

if __name__ == "__main__":
    main()
