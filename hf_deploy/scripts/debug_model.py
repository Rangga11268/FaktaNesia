import pickle
import sys

try:
    with open('model/hoax_model.pkl', 'rb') as f:
        pipeline = pickle.load(f)
    print("Model loaded.")
except Exception as e:
    print(f"Error loading model: {e}")
    sys.exit(1)

vectorizer = pipeline.named_steps['tfidf']
clf = pipeline.named_steps['clf']
feature_names = vectorizer.get_feature_names_out()

# Get top 20 keywords for HOAX class (coefficient > 0)
coefs = clf.coef_[0]
sorted_indices = coefs.argsort()

print("\n--- TOP HOAX KEYWORDS (Positive Coefs) ---")
top_hoax = sorted_indices[-20:][::-1]
for idx in top_hoax:
    print(f"{feature_names[idx]}: {coefs[idx]:.4f}")

print("\n--- TOP REAL KEYWORDS (Negative Coefs) ---")
top_real = sorted_indices[:20]
for idx in top_real:
    print(f"{feature_names[idx]}: {coefs[idx]:.4f}")

# Test specific input
test_text = "SELAMAT! Pemilik E-KTP akan mendapatkan bantuan dana tunai sebesar Rp 150 Juta"
print(f"\n--- TESTING INPUT: '{test_text}' ---")
processed = vectorizer.transform([test_text])
prob = clf.predict_proba(processed)[0]
pred = clf.predict(processed)[0]

print(f"Prediction: {pred} (1=Hoax, 0=Real)")
print(f"Probability: Real={prob[0]:.4f}, Hoax={prob[1]:.4f}")

# Check which words in input triggered the score
print("\n--- Word Contribution ---")
input_indices = processed.nonzero()[1]
for idx in input_indices:
    word = feature_names[idx]
    weight = coefs[idx]
    print(f"Word: '{word}' -> Weight: {weight:.4f} ({'HOAX' if weight>0 else 'REAL'})")
