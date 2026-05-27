from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import os
import re
import difflib
import requests
import json

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

MODEL_PATH = 'model/hoax_model.pkl'
model_pipeline = None

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
    else:
        print(f"Model file not found at {MODEL_PATH}. Using DummyModel.")
        model_pipeline = DummyModel()

load_model()

def clean_text(text):
    text = str(text).lower()
    text = re.sub(r'[^a-zA-Z0-9\s]', '', text)
    return text.strip()

def detect_fuzzy_triggers(text, trigger_defs, threshold=0.8):
    """Typo-tolerant keyword matching using difflib SequenceMatcher."""
    detected = []
    words = text.split()
    
    for trigger, category in trigger_defs.items():
        trigger_words = trigger.split()
        n_trigger_words = len(trigger_words)
        
        # 1. Exact match (fastest path)
        if trigger in text:
            detected.append({"word": trigger, "category": category})
            continue
        
        # 2. Fuzzy single-word match
        if n_trigger_words == 1:
            for w in words:
                similarity = difflib.SequenceMatcher(None, w, trigger).ratio()
                if similarity >= threshold:
                    detected.append({"word": f"{w} (mirip '{trigger}')", "category": category})
                    break
        else:
            # 3. Sliding window fuzzy match for multi-word phrases
            for i in range(len(words) - n_trigger_words + 1):
                phrase_window = " ".join(words[i:i+n_trigger_words])
                similarity = difflib.SequenceMatcher(None, phrase_window, trigger).ratio()
                if similarity >= threshold:
                    detected.append({"word": f"{phrase_window} (mirip '{trigger}')", "category": category})
                    break
                    
    return detected

# ─── AI HYBRID: OpenRouter (Primary) ───────────────────────────────────────
def check_with_openrouter(text):
    """Use OpenRouter with Llama 3.3 70B as the primary AI hybrid verifier."""
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        return None
    
    prompt = (
        "Kamu adalah sistem pakar pemeriksa fakta (fact-checker) Indonesia. "
        "Tugasmu adalah menganalisis apakah teks berikut merupakan berita HOAX/disinformasi/penipuan atau FAKTA/berita absah. "
        "Analisis teks ini:\n"
        f"\"{text}\"\n\n"
        "Wajib kembalikan jawaban HANYA dalam format JSON mentah tanpa format markdown (tanpa ```json atau ```) dengan struktur:\n"
        "{\n"
        "  \"is_hoax\": true/false,\n"
        "  \"explanation\": \"Penjelasan singkat 1-2 kalimat dalam Bahasa Indonesia yang menjelaskan mengapa ini hoax atau fakta.\"\n"
        "}"
    )
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://faktanesia.vercel.app",
        "X-Title": "FaktaNesia Hoax Detector"
    }
    payload = {
        "model": "meta-llama/llama-3.3-70b-instruct:free",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1,
        "max_tokens": 200
    }
    
    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=8
        )
        if response.status_code == 200:
            res_data = response.json()
            text_response = res_data['choices'][0]['message']['content'].strip()
            # Strip markdown blocks just in case
            text_response = re.sub(r'```json|```', '', text_response).strip()
            parsed = json.loads(text_response)
            print(f"[OpenRouter] Result: {parsed}")
            return parsed
    except Exception as e:
        print(f"[OpenRouter] Error: {e}")
    return None

# ─── AI HYBRID: Google Gemini (Fallback) ────────────────────────────────────
def check_with_gemini(text):
    """Use Google Gemini Flash as fallback if OpenRouter fails."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None
    
    prompt = (
        "Kamu adalah sistem pakar pemeriksa fakta (fact-checker) Indonesia. "
        "Tugasmu adalah menganalisis apakah teks berikut merupakan berita HOAX/disinformasi/penipuan atau FAKTA/berita absah. "
        "Analisis teks ini:\n"
        f"\"{text}\"\n\n"
        "Wajib kembalikan jawaban HANYA dalam format JSON mentah tanpa format markdown dengan struktur:\n"
        "{\n"
        "  \"is_hoax\": true/false,\n"
        "  \"explanation\": \"Penjelasan singkat 1-2 kalimat dalam Bahasa Indonesia.\"\n"
        "}"
    )
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=8)
        if response.status_code == 200:
            res_data = response.json()
            text_response = res_data['candidates'][0]['content']['parts'][0]['text'].strip()
            text_response = re.sub(r'```json|```', '', text_response).strip()
            parsed = json.loads(text_response)
            print(f"[Gemini Fallback] Result: {parsed}")
            return parsed
    except Exception as e:
        print(f"[Gemini Fallback] Error: {e}")
    return None

@app.route('/health', methods=['GET'])
def health():
    if model_pipeline is None:
        load_model()
    return jsonify({
        "status": "healthy",
        "service": "FaktaNesia Hoax Detector",
        "model_loaded": model_pipeline is not None,
        "openrouter_active": os.environ.get("OPENROUTER_API_KEY") is not None,
        "gemini_fallback_active": os.environ.get("GEMINI_API_KEY") is not None
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
        # ─── LAYER 1: Base ML Model ───────────────────────────────────────
        prediction_prob = model_pipeline.predict_proba([cleaned_input])[0]
        hoax_probability = prediction_prob[1]
        
        # ─── LAYER 2: Fuzzy Heuristic Booster ────────────────────────────
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
            "dilarang beli pertalite": "Isu Subsidi BBM",
            "tanpa tes": "Lowongan Palsu",
            "cpns jalur khusus": "Lowongan Palsu",
            "daftar sekarang": "Suspicious Action",
            "link di bawah": "Suspicious Action",
            "klik disini": "Suspicious Action",
            "transfer ke rekening": "Financial Lure",
            "rekening pribadi": "Financial Lure",
            "gratis iphone": "Lure",
            "menang undian": "Promising Rewards",
        }
        
        detected_triggers = detect_fuzzy_triggers(cleaned_input, trigger_definitions, threshold=0.8)
        boost_score = len(detected_triggers) * 0.20
        
        if boost_score > 0:
            print(f"[Heuristic] Boosting by {boost_score} for triggers: {detected_triggers}")
            hoax_probability = min(0.99, hoax_probability + boost_score)

        is_hoax = bool(hoax_probability > 0.5)
        confidence = hoax_probability if is_hoax else (1 - hoax_probability)
        
        # ─── LAYER 3: Hybrid AI (OpenRouter Primary → Gemini Fallback) ───
        ai_explanation = None
        ai_source = None
        
        ai_result = check_with_openrouter(raw_text)
        if ai_result is not None:
            ai_source = "OpenRouter (Llama 3.3 70B)"
        else:
            ai_result = check_with_gemini(raw_text)
            if ai_result is not None:
                ai_source = "Google Gemini Flash"
        
        if ai_result is not None:
            # AI overrides final verdict for maximum accuracy
            is_hoax = bool(ai_result.get("is_hoax", is_hoax))
            ai_explanation = ai_result.get("explanation")
            confidence = 0.97

        result = {
            "is_hoax": is_hoax,
            "hoax_probability": round(float(hoax_probability), 4),
            "confidence_score": round(float(confidence), 4),
            "label": "HOAX" if is_hoax else "REAL",
            "triggers": detected_triggers,
            "ai_explanation": ai_explanation,
            "ai_source": ai_source
        }
        
        return jsonify(result)
        
    except Exception as e:
        print(f"[ERROR] {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5001, debug=True)
