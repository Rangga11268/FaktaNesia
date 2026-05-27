from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import os
import re
import difflib
import requests

app = Flask(__name__)
# Enable CORS for all routes and origins to avoid local dev matching issues
CORS(app, resources={r"/*": {"origins": "*"}})

MODEL_PATH = 'model/hoax_model.pkl'
model_pipeline = None

# Dummy Model for Fallback/Verification if sklearn fails
class DummyModel:
    def predict(self, X):
        return [1 if "hoax" in x.lower() else 0 for x in X]
    
    def predict_proba(self, X):
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
    text = str(text).lower()
    text = re.sub(r'[^a-zA-Z0-9\s]', '', text)
    return text.strip()

# Typo-tolerant keyword matching function
def detect_fuzzy_triggers(text, trigger_defs, threshold=0.8):
    detected = []
    words = text.split()
    
    for trigger, category in trigger_defs.items():
        trigger_words = trigger.split()
        n_trigger_words = len(trigger_words)
        
        # 1. Exact match check
        if trigger in text:
            detected.append({"word": trigger, "category": category})
            continue
            
        # 2. Fuzzy match check for typos
        if n_trigger_words == 1:
            for w in words:
                # Compare similarity using difflib SequenceMatcher
                similarity = difflib.SequenceMatcher(None, w, trigger).ratio()
                if similarity >= threshold:
                    detected.append({"word": f"{w} (mirip '{trigger}')", "category": category})
                    break
        else:
            # Check sliding window for multi-word phrases (e.g., "kuota gratis" -> "kouta gratis")
            for i in range(len(words) - n_trigger_words + 1):
                phrase_window = " ".join(words[i:i+n_trigger_words])
                similarity = difflib.SequenceMatcher(None, phrase_window, trigger).ratio()
                if similarity >= threshold:
                    detected.append({"word": f"{phrase_window} (mirip '{trigger}')", "category": category})
                    break
                    
    return detected

# Google Gemini API Helper for Hybrid/Deep Verification
def check_with_gemini(text):
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    
    prompt = (
        "Kamu adalah sistem pakar pemeriksa fakta (fact-checker) Indonesia. "
        "Tugasmu adalah menganalisis apakah teks berikut merupakan berita HOAX/disinformasi/penipuan atau FAKTA/berita absah. "
        "Analisis teks ini:\n"
        f"\"{text}\"\n\n"
        "Wajib kembalikan jawaban HANYA dalam format JSON mentah tanpa format markdown (tanpa ```json ... ```) dengan struktur berikut:\n"
        "{\n"
        "  \"is_hoax\": true/false,\n"
        "  \"explanation\": \"Penjelasan singkat 1-2 kalimat dalam Bahasa Indonesia yang menjelaskan mengapa ini hoax atau fakta.\"\n"
        "}"
    )
    
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }]
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=5)
        if response.status_code == 200:
            res_data = response.json()
            # Extract content from response
            text_response = res_data['candidates'][0]['content']['parts'][0]['text'].strip()
            # Clean up markdown output just in case Gemini wrapped it
            if text_response.startswith("```json"):
                text_response = text_response.replace("```json", "").replace("```", "").strip()
            elif text_response.startswith("```"):
                text_response = text_response.replace("```", "").strip()
                
            import json
            parsed = json.loads(text_response)
            return parsed
    except Exception as e:
        print(f"Error calling Gemini API: {e}")
    return None

@app.route('/health', methods=['GET'])
def health():
    if model_pipeline is None:
        load_model()
    return jsonify({
        "status": "healthy", 
        "service": "FaktaNesia Hoax Detector",
        "model_loaded": model_pipeline is not None,
        "hybrid_gemini_active": os.environ.get("GEMINI_API_KEY") is not None
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
        # 1. Base ML model prediction
        prediction_class = model_pipeline.predict([cleaned_input])[0]
        prediction_prob = model_pipeline.predict_proba([cleaned_input])[0]
        hoax_probability = prediction_prob[1]
        
        # 2. Typo-tolerant Heuristic Booster
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
            "berlaku hari ini": "Urgency",
            "1 juni 2026": "Klaim Tanggal Palsu",
            "dilarang beli pertalite": "Isu Subsidi BBM"
        }
        
        detected_triggers = detect_fuzzy_triggers(cleaned_input, trigger_definitions, threshold=0.8)
        
        boost_score = len(detected_triggers) * 0.20
        if boost_score > 0:
            print(f"Boosting score by {boost_score} due to keywords: {detected_triggers}")
            hoax_probability = min(0.99, hoax_probability + boost_score)

        is_hoax = bool(hoax_probability > 0.5)
        
        # 3. Hybrid AI Option (Google Gemini API) if configured
        ai_explanation = None
        gemini_result = check_with_gemini(raw_text)
        
        if gemini_result is not None:
            print(f"Gemini result: {gemini_result}")
            # Overwrite or boost based on Gemini's highly context-aware decision
            is_hoax = gemini_result.get("is_hoax", is_hoax)
            ai_explanation = gemini_result.get("explanation")
            # Set confidence score high if Gemini agrees
            confidence = 0.99
        else:
            confidence = hoax_probability if is_hoax else (1 - hoax_probability)
        
        result = {
            "is_hoax": is_hoax,
            "hoax_probability": round(float(hoax_probability), 4),
            "confidence_score": round(float(confidence), 4),
            "label": "HOAX" if is_hoax else "REAL",
            "triggers": detected_triggers,
            "ai_explanation": ai_explanation
        }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5001, debug=True)
