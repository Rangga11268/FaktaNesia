import csv
import os
import pickle
import sys

# Scikit-learn imports - hoping these don't hang like pandas
try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    from sklearn.pipeline import Pipeline
    print("Sklearn imported successfully")
except ImportError as e:
    print(f"Error importing sklearn: {e}")
    sys.exit(1)

def get_text_from_row(row, headers):
    # Try common text columns
    candidates = ['content', 'isi', 'full_text', 'title', 'judul']
    for col in candidates:
        if col in headers:
            try:
                idx = headers.index(col)
                if idx < len(row) and row[idx]:
                    return row[idx]
            except:
                pass
    # Fallback: join all fields
    return " ".join(row)

def load_data_from_csv(filepath, label, limit=200):
    texts = []
    labels = []
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return texts, labels
    
    try:
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            reader = csv.reader(f)
            headers = next(reader, None)
            if not headers:
                return texts, labels
            
            # Normalize headers
            headers = [h.strip().lower() for h in headers]
            
            count = 0
            for row in reader:
                if count >= limit:
                    break
                text = get_text_from_row(row, headers)
                if text and len(text) > 20: # Filter short noise
                    texts.append(text)
                    labels.append(label)
                    count += 1
            print(f"Loaded {len(texts)} rows from {filepath}")
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        
    return texts, labels

def main():
    print("Starting minimal training...")
    
    all_texts = []
    all_labels = []

    # Real News (Label 0)
    real_files = [
        'data/Cleaned_Antaranews_v1.csv',
        'data/Cleaned_Detik_v2.csv',
        'data/Cleaned_Kompas_v2.csv'
    ]
    for f in real_files:
        t, l = load_data_from_csv(f, 0, limit=200)
        all_texts.extend(t)
        all_labels.extend(l)

    # Hoax News (Label 1)
    hoax_files = [
        'data/Cleaned_TurnBackHoax_v3.csv',
        'data/komdigi_hoaks.csv'
    ]
    for f in hoax_files:
        t, l = load_data_from_csv(f, 1, limit=300) # Slight boost to hoaxes if needed
        all_texts.extend(t)
        all_labels.extend(l)
    
    print(f"Total data: {len(all_texts)} samples")
    if not all_texts:
        print("No data loaded!")
        return

    # Train Pipeline
    print("Training model...")
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(max_features=5000, ngram_range=(1,2))),
        ('clf', LogisticRegression())
    ])
    pipeline.fit(all_texts, all_labels)
    
    # Save
    os.makedirs('model', exist_ok=True)
    out_path = 'model/hoax_model.pkl'
    with open(out_path, 'wb') as f:
        pickle.dump(pipeline, f)
    print(f"Model saved to {out_path}")

if __name__ == '__main__':
    main()
