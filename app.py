from flask import Flask, request, jsonify
from flask_cors import CORS
import xgboost as xgb
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
            print("[OK] Model loaded.")
        except Exception as e:
            print(f"[WARN] Model load failed: {e}. Using DummyModel.")
            model_pipeline = DummyModel()
    else:
        print(f"[WARN] Model not found at {MODEL_PATH}. Using DummyModel.")
        model_pipeline = DummyModel()

load_model()

def normalize_text(text):
    """Normalize text: lowercase, remove punctuation, normalize common typos."""
    text = str(text).lower()
    # Normalize common number + word combinations
    text = re.sub(r'rp\.?\s*[\d,.]+\s*(juta|ribu|miliar|m|rb|jt)?', 'uangbanyak', text)
    # Normalize URLs
    text = re.sub(r'http\S+|www\.\S+', 'linkurl', text)
    # Remove punctuation but keep spaces
    text = re.sub(r'[^a-zA-Z0-9\s]', ' ', text)
    # Normalize multiple spaces
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def clean_text(text):
    """Basic clean for ML model input."""
    text = str(text).lower()
    text = re.sub(r'[^a-zA-Z0-9\s]', '', text)
    return text.strip()

# ─── COMPREHENSIVE TRIGGER DATABASE ─────────────────────────────────────────
# Format: (keyword, category, boost_weight)
# boost_weight: 0.25 = normal, 0.35 = strong, 0.50 = instant hoax signal
TRIGGER_DATABASE = [
    # === FINANCIAL SCAM & LURE ===
    ("bansos cair",         "Penipuan Bantuan Sosial", 0.50),
    ("blt cair",            "Penipuan Bantuan Sosial", 0.50),
    ("blt gratis",          "Penipuan Bantuan Sosial", 0.50),
    ("bansos gratis",       "Penipuan Bantuan Sosial", 0.50),
    ("dana bansos",         "Penipuan Bantuan Sosial", 0.35),
    ("bantuan sosial cair", "Penipuan Bantuan Sosial", 0.50),
    ("subsidi cair",        "Penipuan Bantuan Sosial", 0.35),
    ("transfer uang gratis","Financial Lure",          0.50),
    ("uang gratis",         "Financial Lure",          0.50),
    ("saldo gratis",        "Financial Lure",          0.50),
    ("saldo dana gratis",   "Financial Lure",          0.50),
    ("gopay gratis",        "Financial Lure",          0.50),
    ("ovo gratis",          "Financial Lure",          0.50),
    ("cashback gratis",     "Financial Lure",          0.35),
    ("hadiah uang tunai",   "Financial Lure",          0.50),
    ("menang undian",       "Promising Rewards",       0.50),
    ("pemenang beruntung",  "Promising Rewards",       0.50),
    ("selamat anda terpilih","Phishing Hook",          0.50),
    ("selamat anda menang", "Phishing Hook",           0.50),
    ("selamat anda mendapatkan","Phishing Hook",       0.50),
    ("hadiah senilai",      "Promising Rewards",       0.50),
    ("hadiah miliaran",     "Promising Rewards",       0.50),
    ("anda terpilih",       "Phishing Hook",           0.35),
    ("tanpa diundi",        "Suspicious Promise",      0.50),
    ("tanpa syarat",        "Suspicious Promise",      0.25),
    ("gratis tanpa",        "Suspicious Promise",      0.25),

    # === PHISHING & SUSPICIOUS LINKS ===
    ("klik link",           "Suspicious Action",       0.35),
    ("klik disini",         "Suspicious Action",       0.35),
    ("klik di sini",        "Suspicious Action",       0.35),
    ("link di bawah",       "Suspicious Action",       0.35),
    ("daftar sekarang",     "Suspicious Action",       0.25),
    ("daftar di sini",      "Suspicious Action",       0.25),
    ("linkurl",             "Suspicious Link",         0.25),
    ("bit.ly",              "Suspicious Link",         0.35),
    ("s.id",                "Suspicious Link",         0.25),
    ("formulir pendaftaran","Suspicious Action",       0.25),
    ("isi formulir",        "Suspicious Action",       0.25),
    ("verifikasi data anda","Phishing Hook",           0.50),
    ("konfirmasi identitas","Phishing Hook",           0.35),
    ("masukkan pin",        "Phishing Hook",           0.50),
    ("masukkan otp",        "Phishing Hook",           0.50),
    ("jangan beritahu otp", "Phishing Hook",           0.50),
    ("transfer ke rekening","Financial Lure",          0.50),
    ("rekening pribadi",    "Financial Lure",          0.50),
    ("dp terlebih dahulu",  "Financial Lure",          0.35),

    # === IMPERSONATION & FAKE AUTHORITY ===
    ("resmi dari whatsapp", "Impersonation",           0.50),
    ("resmi dari pemerintah","Impersonation",          0.35),
    ("resmi dari bpjs",     "Impersonation",           0.50),
    ("resmi dari kominfo",  "Impersonation",           0.50),
    ("resmi dari bank",     "Impersonation",           0.35),
    ("bpjs kesehatan memberikan","Impersonation",      0.50),
    ("kemenkes memberikan", "Impersonation",           0.50),
    ("kementerian memberikan","Impersonation",         0.35),
    ("mengatasnamakan",     "Impersonation",           0.35),
    ("atas nama presiden",  "Impersonation",           0.50),
    ("atas nama jokowi",    "Impersonation",           0.50),
    ("atas nama prabowo",   "Impersonation",           0.50),
    ("info dari bapak presiden","Impersonation",       0.50),

    # === URGENCY & PRESSURE TACTICS ===
    ("berlaku hari ini",    "Urgency",                 0.35),
    ("berlaku sampai",      "Urgency",                 0.25),
    ("batas waktu",         "Urgency",                 0.25),
    ("jangan sampai ketinggalan","Urgency",            0.25),
    ("segera klaim",        "Urgency",                 0.50),
    ("klaim sebelum",       "Urgency",                 0.35),
    ("hanya hari ini",      "Urgency",                 0.35),
    ("stok terbatas",       "Urgency",                 0.25),
    ("kesempatan terakhir", "Urgency",                 0.35),
    ("jangan lewatkan",     "Urgency",                 0.25),
    ("sebarkan segera",     "Urgency",                 0.35),
    ("sebarkan sebelum dihapus","Urgency",             0.50),
    ("forward ke semua",    "Chain Message",           0.50),
    ("kirim ke teman",      "Chain Message",           0.35),
    ("bagikan ke",          "Chain Message",           0.25),
    ("sebarkan ke",         "Chain Message",           0.35),
    ("viralkan",            "Chain Message",           0.25),

    # === FREE LURES ===
    ("kuota gratis",        "Lure",                    0.50),
    ("internet gratis",     "Lure",                    0.35),
    ("pulsa gratis",        "Lure",                    0.50),
    ("gratis selamanya",    "Lure",                    0.35),
    ("gratis iphone",       "Lure",                    0.50),
    ("gratis samsung",      "Lure",                    0.50),
    ("gratis laptop",       "Lure",                    0.50),
    ("gratis motor",        "Lure",                    0.50),
    ("bagi bagi",           "Lure",                    0.35),
    ("bagibagi",            "Lure",                    0.35),
    ("bagi-bagi",           "Lure",                    0.35),
    ("gratis untuk",        "Lure",                    0.25),

    # === JOB/CPNS SCAMS ===
    ("cpns tanpa tes",      "Lowongan Palsu",          0.50),
    ("jalur khusus cpns",   "Lowongan Palsu",          0.50),
    ("cpns jalur khusus",   "Lowongan Palsu",          0.50),
    ("loker tanpa ijazah",  "Lowongan Palsu",          0.50),
    ("kerja dari rumah",    "Lowongan Palsu",          0.25),
    ("gaji besar tanpa",    "Lowongan Palsu",          0.35),
    ("penghasilan jutaan",  "Lowongan Palsu",          0.25),
    ("modal kecil untung",  "Investment Scam",         0.35),
    ("investasi menggiurkan","Investment Scam",        0.35),
    ("passive income",      "Investment Scam",         0.25),
    ("trading robot",       "Investment Scam",         0.35),
    ("robot trading",       "Investment Scam",         0.35),
    ("cuan mudah",          "Investment Scam",         0.35),
    ("profit guaranteed",   "Investment Scam",         0.50),
    ("binary option",       "Investment Scam",         0.50),

    # === HEALTH MISINFORMATION ===
    ("obat covid",          "Health Misinformation",   0.25),
    ("sembuhkan covid",     "Health Misinformation",   0.35),
    ("vaksin berbahaya",    "Health Misinformation",   0.50),
    ("vaksin menyebabkan",  "Health Misinformation",   0.35),
    ("vaksin mengandung",   "Health Misinformation",   0.35),
    ("air kelapa menyembuhkan","Health Misinformation",0.35),
    ("bawang putih sembuhkan","Health Misinformation", 0.35),
    ("jahe sembuhkan",      "Health Misinformation",   0.25),
    ("dokter disembunyikan","Health Misinformation",   0.50),
    ("obat mujarab",        "Health Misinformation",   0.35),
    ("herbal menyembuhkan kanker","Health Misinformation",0.50),
    ("kanker sembuh dengan","Health Misinformation",   0.35),

    # === BBM / SUBSIDI HOAXES ===
    ("1 juni 2026",         "Klaim Tanggal Palsu",     0.50),
    ("dilarang beli pertalite","Isu Subsidi BBM",      0.50),
    ("pertalite dihapus",   "Isu Subsidi BBM",         0.50),
    ("bbm naik",            "Isu Subsidi BBM",         0.25),
    ("harga bbm naik",      "Isu Subsidi BBM",         0.25),
    ("pembatasan bbm",      "Isu Subsidi BBM",         0.35),
    ("kartu beli bbm",      "Isu Subsidi BBM",         0.50),

    # === POLITICAL & RELIGIOUS HOAXES ===
    ("islam terancam",      "Political/Religious",     0.50),
    ("kristen terancam",    "Political/Religious",     0.50),
    ("kafir",               "Political/Religious",     0.25),
    ("sesat",               "Political/Religious",     0.25),
    ("penistaan agama",     "Political/Religious",     0.35),
    ("presiden mundur",     "Political Hoax",          0.50),
    ("kudeta",              "Political Hoax",          0.35),
    ("darurat militer",     "Political Hoax",          0.35),
    ("pki bangkit",         "Political Hoax",          0.50),
    ("tni bergerak",        "Political Hoax",          0.35),
    ("polri berkhianat",    "Political Hoax",          0.50),

    # === DISASTER HOAXES ===
    ("gempa besar besok",   "Disaster Hoax",           0.50),
    ("gempa megathrust",    "Disaster Hoax",           0.35),
    ("tsunami akan",        "Disaster Hoax",           0.50),
    ("gunung meletus besok","Disaster Hoax",           0.50),
    ("bom di",              "Disaster Hoax",           0.35),
    ("perang akan",         "Disaster Hoax",           0.35),

    # === GENERAL HIGH-SIGNAL PATTERNS ===
    ("terbukti ilmiah",     "Pseudoscience",           0.25),
    ("para ilmuwan terkejut","Pseudoscience",          0.35),
    ("rahasia yang disembunyikan","Clickbait",         0.50),
    ("fakta mengejutkan",   "Clickbait",               0.25),
    ("yang tidak mau tahu", "Clickbait",               0.35),
    ("jangan sampai",       "Clickbait",               0.25),
    ("ini rahasianya",      "Clickbait",               0.25),
    ("simak baik baik",     "Clickbait",               0.25),
    ("99 dari 100 orang",   "Pseudoscience",           0.35),
]

def detect_fuzzy_triggers(normalized_text, threshold=0.82):
    """Typo-tolerant keyword matching with variable boost weights."""
    detected = []
    words = normalized_text.split()
    already_matched = set()

    for trigger, category, weight in TRIGGER_DATABASE:
        if trigger in already_matched:
            continue

        trigger_words = trigger.split()
        n = len(trigger_words)

        # 1. Exact match
        if trigger in normalized_text:
            detected.append({"word": trigger, "category": category, "boost": weight})
            already_matched.add(trigger)
            continue

        # 2. Fuzzy single-word match
        if n == 1:
            for w in words:
                if len(w) >= 3:  # Skip very short words
                    sim = difflib.SequenceMatcher(None, w, trigger).ratio()
                    if sim >= threshold:
                        label = f"{w} (≈'{trigger}')"
                        detected.append({"word": label, "category": category, "boost": weight * 0.8})
                        already_matched.add(trigger)
                        break
        else:
            # 3. Sliding window for multi-word phrases
            for i in range(len(words) - n + 1):
                phrase = " ".join(words[i:i+n])
                sim = difflib.SequenceMatcher(None, phrase, trigger).ratio()
                if sim >= threshold:
                    label = f"{phrase} (≈'{trigger}')"
                    detected.append({"word": label, "category": category, "boost": weight * 0.85})
                    already_matched.add(trigger)
                    break

    return detected

# ─── OPENROUTER (Primary AI) — FREE MODELS ONLY ─────────────────────────────
def check_with_openrouter(text):
    """Use OpenRouter Llama 3.3 70B free tier for AI verification."""
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        return None

    prompt = (
        "Kamu adalah sistem pakar pemeriksa fakta (fact-checker) Indonesia. "
        "Tugasmu adalah menganalisis apakah teks berikut merupakan berita HOAX, disinformasi, "
        "penipuan, atau pesan berantai berbahaya — ataukah berita FAKTA yang absah. "
        "Perhatikan pola: iming-iming uang gratis, bantuan sosial palsu, link mencurigakan, "
        "klaim kesehatan tidak masuk akal, atau tekanan untuk segera bertindak.\n\n"
        f"Teks: \"{text}\"\n\n"
        "Kembalikan HANYA JSON tanpa markdown:\n"
        "{\"is_hoax\": true/false, \"explanation\": \"penjelasan 1-2 kalimat Bahasa Indonesia\"}"
    )

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://faktanesia.vercel.app",
        "X-Title": "FaktaNesia"
    }
    # IMPORTANT: Only use ':free' suffix models to avoid any charges
    payload = {
        "model": "meta-llama/llama-3.3-70b-instruct:free",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.05,
        "max_tokens": 180
    }

    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=8
        )
        if response.status_code == 200:
            raw = response.json()['choices'][0]['message']['content'].strip()
            raw = re.sub(r'```json|```', '', raw).strip()
            parsed = json.loads(raw)
            print(f"[OpenRouter] {parsed}")
            return parsed
        else:
            print(f"[OpenRouter] HTTP {response.status_code}: {response.text[:200]}")
    except Exception as e:
        print(f"[OpenRouter] Error: {e}")
    return None

# ─── GEMINI (Fallback AI) ────────────────────────────────────────────────────
def check_with_gemini(text):
    """Use Google Gemini Flash as fallback only."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None

    prompt = (
        "Kamu adalah fact-checker Indonesia. Analisis: apakah ini HOAX atau FAKTA?\n"
        f"Teks: \"{text}\"\n"
        "Kembalikan HANYA JSON tanpa markdown:\n"
        "{\"is_hoax\": true/false, \"explanation\": \"penjelasan 1-2 kalimat Bahasa Indonesia\"}"
    )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    payload = {"contents": [{"parts": [{"text": prompt}]}]}

    try:
        response = requests.post(url, headers={"Content-Type": "application/json"},
                                 json=payload, timeout=8)
        if response.status_code == 200:
            raw = response.json()['candidates'][0]['content']['parts'][0]['text'].strip()
            raw = re.sub(r'```json|```', '', raw).strip()
            parsed = json.loads(raw)
            print(f"[Gemini Fallback] {parsed}")
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
        "service": "FaktaNesia Hoax Detector v2",
        "model_loaded": model_pipeline is not None,
        "openrouter_active": os.environ.get("OPENROUTER_API_KEY") is not None,
        "gemini_fallback_active": os.environ.get("GEMINI_API_KEY") is not None,
        "trigger_count": len(TRIGGER_DATABASE)
    })

@app.route('/predict', methods=['POST'])
def predict():
    if model_pipeline is None:
        load_model()
        if model_pipeline is None:
            return jsonify({"error": "Model not available"}), 503

    data = request.get_json()
    if not data or 'text' not in data:
        return jsonify({"error": "No text provided"}), 400

    raw_text = data['text']
    normalized = normalize_text(raw_text)
    cleaned = clean_text(raw_text)

    if not normalized.strip():
        return jsonify({"error": "Empty text input"}), 400

    try:
        # ─── LAYER 1: ML Model Base Prediction ───────────────────────────
        prediction_prob = model_pipeline.predict_proba([cleaned])[0]
        hoax_probability = float(prediction_prob[1])

        # ─── LAYER 2: Fuzzy Heuristic Booster ────────────────────────────
        detected_triggers = detect_fuzzy_triggers(normalized, threshold=0.82)

        # Sum up boost weights from all matched triggers
        total_boost = sum(t.get("boost", 0.25) for t in detected_triggers)

        if total_boost > 0:
            print(f"[Heuristic] Total boost: {total_boost:.2f} | Triggers: {[t['word'] for t in detected_triggers]}")
            hoax_probability = min(0.99, hoax_probability + total_boost)

        # Strip boost key from output (not needed in frontend)
        clean_triggers = [{"word": t["word"], "category": t["category"]} for t in detected_triggers]

        is_hoax = bool(hoax_probability > 0.5)
        confidence = hoax_probability if is_hoax else (1 - hoax_probability)

        # ─── LAYER 3: AI Hybrid (OpenRouter primary → Gemini fallback) ───
        ai_explanation = None
        ai_source = None

        ai_result = check_with_openrouter(raw_text)
        if ai_result is not None:
            ai_source = "OpenRouter Llama 3.3 70B"
        else:
            ai_result = check_with_gemini(raw_text)
            if ai_result is not None:
                ai_source = "Google Gemini Flash"

        if ai_result is not None:
            # AI final override — most context-aware decision
            is_hoax = bool(ai_result.get("is_hoax", is_hoax))
            ai_explanation = ai_result.get("explanation")
            confidence = 0.97

        return jsonify({
            "is_hoax": is_hoax,
            "hoax_probability": round(hoax_probability, 4),
            "confidence_score": round(confidence, 4),
            "label": "HOAX" if is_hoax else "REAL",
            "triggers": clean_triggers,
            "ai_explanation": ai_explanation,
            "ai_source": ai_source
        })

    except Exception as e:
        print(f"[ERROR] {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5001, debug=True)
