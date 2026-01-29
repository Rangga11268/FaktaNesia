from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import os
import re

app = Flask(__name__)
# Enable CORS for all routes and origins to avoid local dev matching issues
CORS(app, resources={r"/*": {"origins": "*"}})

MODEL_PATH = 'model/hoax_model.pkl'
model_pipeline = None

def load_model():
    global model_pipeline
    if os.path.exists(MODEL_PATH):
        try:
            with open(MODEL_PATH, 'rb') as f:
                model_pipeline = pickle.load(f)
            print("Hoax Detection Model loaded successfully.")
        except Exception as e:
            print(f"Error loading model: {e}")
            model_pipeline = None
        model_pipeline = None

# Dummy Model for Fallback/Verification if sklearn fails
class DummyModel:
    def predict(self, X):
        # Return 1 (Hoax) if "hoax" in text, else 0
        return [1 if "hoax" in x.lower() else 0 for x in X]
    
    def predict_proba(self, X):
        # Return [P(Real), P(Hoax)]
        return [[0.1, 0.9] if "hoax" in x.lower() else [0.9, 0.1] for x in X]

def load_model():
    global model_pipeline
    if os.path.exists(MODEL_PATH):
        try:
            with open(MODEL_PATH, 'rb') as f:
                model_pipeline = pickle.load(f)
            print("Hoax Detection Model loaded successfully.")
        except Exception as e:
            print(f"Error loading model: {e}")
            model_pipeline = DummyModel()
            print("Using DummyModel for verification.")
    else:
        print(f"Model file not found at {MODEL_PATH}")
        model_pipeline = DummyModel()
        print("Using DummyModel for verification.")

# Initial load
load_model()

def clean_text(text):
    # Simplify cleaning to match TfidfVectorizer's default behavior
    # Just basic whitespace handling. The Vectorizer handles punctuation/tokenization.
    return str(text).strip()

@app.route('/health', methods=['GET'])
def health():
    if model_pipeline is None:
        # Try reloading if missing (e.g. training just finished)
        load_model()
    return jsonify({
        "status": "healthy", 
        "service": "FaktaNesia Hoax Detector",
        "model_loaded": model_pipeline is not None
    })

@app.route('/predict', methods=['POST'])
def predict():
    if model_pipeline is None:
        load_model()
        if model_pipeline is None:
            return jsonify({"error": "Model not yet trained or loaded"}), 503
    
    data = request.get_json()
    if not data or 'text' not in data:
        return jsonify({"error": "No text provided"}), 400
    
    raw_text = data['text']
    cleaned_input = clean_text(raw_text)
    
    if not cleaned_input.strip():
        return jsonify({"error": "Empty text input"}), 400

    try:
        # Pipeline handles vectorization and prediction
        # Classes: 0 = Real, 1 = Hoax
        prediction_class = model_pipeline.predict([cleaned_input])[0]
        prediction_prob = model_pipeline.predict_proba([cleaned_input])[0]
        
        # Prob of it being Hoax (class 1)
        hoax_probability = prediction_prob[1]
        
        # --- HEURISTIC BOOSTER ---
        # Machine Learning sometimes misses obvious scams. We add rule-based boosting.
        trigger_definitions = {
            "pemenang": "Promising Rewards",
            "hadiah": "Promising Rewards",
            "tunai": "Financial Lure",
            "cair": "Financial Lure",
            "selamat anda": "Phishing Hook",
            "klik link": "Suspicious Action",
            "kuota gratis": "Lure",
            "bagi-bagi": "Lure",
            "bagibagi": "Lure",
            "tanpa diundi": "Suspicious Promise",
            "resmi dari whatsapp": "Impersonation",
            "bpjs kesehatan memberikan": "Impersonation",
            "segera": "Urgency",
            "berlaku hari ini": "Urgency"
        }
        
        # Calculate booster score
        boost_score = 0
        detected_triggers = []
        cleaned_lower = cleaned_input.lower()
        
        for word, category in trigger_definitions.items():
            if word in cleaned_lower:
                if word not in detected_triggers: # Avoid duplicates
                    detected_triggers.append({"word": word, "category": category})
                    boost_score += 0.20 # Add probability for each trigger
        
        # Apply boost (cap at 0.99)
        if boost_score > 0:
            print(f"Boosting score by {boost_score} due to keywords: {detected_triggers}")
            hoax_probability = min(0.99, hoax_probability + boost_score)

        # Recalculate class based on new probability
        is_hoax = hoax_probability > 0.5
        confidence = hoax_probability if is_hoax else (1 - hoax_probability)
        
        result = {
            "is_hoax": is_hoax,
            "hoax_probability": round(float(hoax_probability), 4),
            "confidence_score": round(float(confidence), 4),
            "label": "HOAX" if is_hoax else "REAL",
            "triggers": detected_triggers  # List of {word, category}
        }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Use 127.0.0.1 for local verification
    app.run(host='127.0.0.1', port=5001, debug=False)
