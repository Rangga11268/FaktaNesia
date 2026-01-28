import pandas as pd
import numpy as np
import os
import pickle
import re
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, accuracy_score

# Configuration
REAL_NEWS_FILES = [
    'data/Cleaned_Antaranews_v1.csv',
    'data/Cleaned_Detik_v2.csv',
    'data/Cleaned_Kompas_v2.csv'
]
HOAX_NEWS_FILES = [
    'data/Cleaned_TurnBackHoax_v3.csv',
    'data/komdigi_hoaks.csv'
]
MODEL_DIR = 'model'

def load_and_label(files, label, label_name):
    dfs = []
    for f in files:
        if os.path.exists(f):
            try:
                # Optimization: Limit rows for faster training/verification
                df = pd.read_csv(f, nrows=100)
                # Flexible column selection for text
                # We prioritize 'content', 'isi', 'full_text' then 'title', 'judul'
                text_col = None
                possible_cols = ['content', 'isi', 'full_text', 'text', 'body', 'judul', 'title']
                
                for col in possible_cols:
                    if col in df.columns:
                        text_col = col
                        break
                
                if text_col:
                    print(f"Loaded {f}: using column '{text_col}'")
                    # Keep only text
                    temp_df = pd.DataFrame({'text': df[text_col].astype(str)})
                    temp_df['label'] = label
                    dfs.append(temp_df)
                else:
                    print(f"Skipping {f}: No text column found. Columns: {df.columns.tolist()}")
            except Exception as e:
                print(f"Error loading {f}: {e}")
        else:
            print(f"File not found: {f}")
    
    if not dfs:
        return pd.DataFrame()
    return pd.concat(dfs, ignore_index=True)

def clean_text(text):
    text = str(text).lower()
    text = re.sub(r'[^a-zA-Z0-9\s]', '', text)
    return text

def main():
    print("Loading Real News...")
    df_real = load_and_label(REAL_NEWS_FILES, 0, "Real")
    
    print("Loading Hoax News...")
    df_hoax = load_and_label(HOAX_NEWS_FILES, 1, "Hoax")
    
    if df_real.empty or df_hoax.empty:
        print("Error: Insufficient data to train.")
        return

    # Combine
    print(f"Real samples: {len(df_real)}, Hoax samples: {len(df_hoax)}")
    
    # Balance datasets if necessary (undersampling majority)
    # Usually Real news is much larger. Let's limit Real to 2x Hoax to prevent massive imbalance, 
    # or just use all if memory allows. Let's cap Real at 1.5 * Hoax size for speed and balance.
    if len(df_real) > 1.5 * len(df_hoax):
        df_real = df_real.sample(int(len(df_hoax) * 1.5), random_state=42)
        print(f"Downsampled Real to: {len(df_real)}")

    df_full = pd.concat([df_real, df_hoax], ignore_index=True)
    df_full['text'] = df_full['text'].apply(clean_text)
    
    X = df_full['text']
    y = df_full['label']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    print("Training Model (TF-IDF + Logistic Regression)...")
    
    # Pipeline
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(max_features=5000, ngram_range=(1,2))),
        ('clf', LogisticRegression(random_state=42))
    ])
    
    pipeline.fit(X_train, y_train)
    
    # Evaluate
    y_pred = pipeline.predict(X_test)
    print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
    print(classification_report(y_test, y_pred, target_names=['Real', 'Hoax']))
    
    # Save
    if not os.path.exists(MODEL_DIR):
        os.makedirs(MODEL_DIR)
        
    model_path = os.path.join(MODEL_DIR, 'hoax_model.pkl')
    with open(model_path, 'wb') as f:
        pickle.dump(pipeline, f)
        
    print(f"Model saved to {model_path}")

if __name__ == "__main__":
    main()
