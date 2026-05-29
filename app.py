from flask import Flask, request, jsonify
from flask_cors import CORS
import xgboost as xgb
import pickle
import os
import re
import difflib
import requests
import json
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
import credibility_manager

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

MODEL_PATH = 'model/hoax_model.pkl'
model_pipeline = None
db_engine = None

URL_REGEX = re.compile(r'https?://\S+|www\.\S+', re.IGNORECASE)

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

def init_database_engine():
    """Initialize SQLAlchemy engine if DATABASE_URL is configured."""
    global db_engine
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("[DB] DATABASE_URL not configured. Running without DB persistence.")
        return
    try:
        db_engine = create_engine(database_url, pool_pre_ping=True)
        with db_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("[DB] Connected.")
    except SQLAlchemyError as e:
        db_engine = None
        print(f"[DB] Connection failed: {e}")

def admin_auth_ok(req):
    """Simple admin auth using ADMIN_TOKEN env var passed via header X-Admin-Token."""
    token = os.environ.get("ADMIN_TOKEN")
    if not token:
        return False
    header = req.headers.get("X-Admin-Token")
    return header == token

@app.route('/reports', methods=['GET'])
def list_reports():
    """List user reports (paginated). Publicly accessible for 'Laporan Warga'."""
    limit = min(100, max(1, int(request.args.get('limit', 25))))
    offset = max(0, int(request.args.get('offset', 0)))
    try:
        if db_engine is None:
            return jsonify({"error": "Database not configured"}), 503
        with db_engine.connect() as conn:
            rows = conn.execute(
                text("SELECT id, text_content, url_submitted, ai_prediction, ai_confidence, category, user_votes_as_hoax, user_votes_as_real, reviewed, reviewer, review_note, reviewed_at, created_at FROM user_reports ORDER BY created_at DESC LIMIT :limit OFFSET :offset"),
                {"limit": limit, "offset": offset}
            ).mappings().all()
        return jsonify({"count": len(rows), "data": [dict(r) for r in rows]})
    except SQLAlchemyError as e:
        print(f"[DB] Failed to list reports: {e}")
        return jsonify({"error": "failed to list reports"}), 500

@app.route('/stats', methods=['GET'])
def get_stats():
    """Get high-level statistics for Admin Dashboard."""
    if os.environ.get("ADMIN_TOKEN") and not admin_auth_ok(request):
        return jsonify({"error": "admin credentials required"}), 403
    try:
        if db_engine is None:
            return jsonify({"error": "Database not configured"}), 503
        with db_engine.connect() as conn:
            total_reports = conn.execute(text("SELECT COUNT(*) as cnt FROM user_reports")).scalar()
            total_hoax = conn.execute(text("SELECT COUNT(*) as cnt FROM user_reports WHERE ai_prediction = 'HOAX'")).scalar()
            total_real = conn.execute(text("SELECT COUNT(*) as cnt FROM user_reports WHERE ai_prediction = 'REAL'")).scalar()
            
            # Fetch category distribution for hoaxes
            cat_rows = conn.execute(
                text("SELECT COALESCE(category, 'Umum') as cat, COUNT(*) as cnt FROM user_reports WHERE ai_prediction = 'HOAX' GROUP BY COALESCE(category, 'Umum')")
            ).mappings().all()
            
            categories = {row["cat"]: row["cnt"] for row in cat_rows}
            
        return jsonify({
            "total_reports": total_reports,
            "total_hoax": total_hoax,
            "total_real": total_real,
            "hoax_percentage": round((total_hoax / total_reports * 100) if total_reports > 0 else 0, 1),
            "categories": categories
        })
    except SQLAlchemyError as e:
        print(f"[DB] Failed to get stats: {e}")
        return jsonify({"error": "failed to fetch stats"}), 500

@app.route('/public-stats', methods=['GET'])
def get_public_stats():
    """Get high-level public statistics for the landing page."""
    try:
        if db_engine is None:
            return jsonify({
                "total_reports": 12,
                "total_hoax": 5,
                "total_real": 7,
                "total_words": 1480,
                "avg_speed": 0.42
            })
        with db_engine.connect() as conn:
            total_reports = conn.execute(text("SELECT COUNT(*) as cnt FROM user_reports")).scalar()
            total_hoax = conn.execute(text("SELECT COUNT(*) as cnt FROM user_reports WHERE ai_prediction = 'HOAX'")).scalar()
            total_real = conn.execute(text("SELECT COUNT(*) as cnt FROM user_reports WHERE ai_prediction = 'REAL'")).scalar()
            
            # Fast estimation of total words: sum text length divided by 5 as average word length
            total_chars = conn.execute(text("SELECT COALESCE(SUM(LENGTH(text_content)), 0) FROM user_reports")).scalar()
            total_words = int(total_chars / 5) if total_chars > 0 else 1480
            
        return jsonify({
            "total_reports": total_reports,
            "total_hoax": total_hoax,
            "total_real": total_real,
            "total_words": total_words,
            "avg_speed": 0.42
        })
    except SQLAlchemyError as e:
        print(f"[DB] Failed to get public stats: {e}")
        return jsonify({"error": "failed to fetch public stats"}), 500

@app.route('/reports/<int:report_id>', methods=['GET'])
def get_report(report_id):
    try:
        if db_engine is None:
            return jsonify({"error": "Database not configured"}), 503
        with db_engine.connect() as conn:
            row = conn.execute(text("SELECT * FROM user_reports WHERE id = :id"), {"id": report_id}).mappings().first()
        if not row:
            return jsonify({"error": "not found"}), 404
        return jsonify(dict(row))
    except SQLAlchemyError as e:
        print(f"[DB] Failed to get report: {e}")
        return jsonify({"error": "failed to fetch report"}), 500

@app.route('/reports/<int:report_id>/vote', methods=['POST'])
def vote_report(report_id):
    data = request.get_json() or {}
    vote = data.get('vote')  # expected 'hoax' or 'real'
    if vote not in ('hoax', 'real'):
        return jsonify({"error": "invalid vote"}), 400
    column = 'user_votes_as_hoax' if vote == 'hoax' else 'user_votes_as_real'
    try:
        if db_engine is None:
            return jsonify({"error": "Database not configured"}), 503
        with db_engine.begin() as conn:
            conn.execute(text(f"UPDATE user_reports SET {column} = {column} + 1 WHERE id = :id"), {"id": report_id})
        return jsonify({"ok": True})
    except SQLAlchemyError as e:
        print(f"[DB] Failed to vote report: {e}")
        return jsonify({"error": "failed to vote"}), 500

@app.route('/reports/<int:report_id>/review', methods=['POST'])
def review_report(report_id):
    if not admin_auth_ok(request):
        return jsonify({"error": "admin credentials required"}), 403
    data = request.get_json() or {}
    reviewed = bool(data.get('reviewed', True))
    reviewer = data.get('reviewer') or 'admin'
    note = data.get('note')
    verdict = data.get('verdict') # 'HOAX' or 'REAL' or None
    try:
        if db_engine is None:
            return jsonify({"error": "Database not configured"}), 503
        with db_engine.begin() as conn:
            if verdict in ('HOAX', 'REAL'):
                conn.execute(text("UPDATE user_reports SET reviewed = :reviewed, reviewer = :reviewer, review_note = :note, ai_prediction = :verdict, reviewed_at = CURRENT_TIMESTAMP WHERE id = :id"), {"reviewed": reviewed, "reviewer": reviewer, "note": note, "verdict": verdict, "id": report_id})
            else:
                conn.execute(text("UPDATE user_reports SET reviewed = :reviewed, reviewer = :reviewer, review_note = :note, reviewed_at = CURRENT_TIMESTAMP WHERE id = :id"), {"reviewed": reviewed, "reviewer": reviewer, "note": note, "id": report_id})
        return jsonify({"ok": True})
    except SQLAlchemyError as e:
        print(f"[DB] Failed to review report: {e}")
        return jsonify({"error": "failed to mark review"}), 500

@app.route('/reports/<int:report_id>', methods=['DELETE'])
def delete_report(report_id):
    if not admin_auth_ok(request):
        return jsonify({"error": "admin credentials required"}), 403
    try:
        if db_engine is None:
            return jsonify({"error": "Database not configured"}), 503
        with db_engine.begin() as conn:
            conn.execute(text("DELETE FROM user_reports WHERE id = :id"), {"id": report_id})
        return jsonify({"ok": True})
    except SQLAlchemyError as e:
        print(f"[DB] Failed to delete report: {e}")
        return jsonify({"error": "failed to delete report"}), 500

@app.route('/reports/bulk-delete', methods=['POST'])
def bulk_delete_reports():
    if not admin_auth_ok(request):
        return jsonify({"error": "admin credentials required"}), 403
    try:
        if db_engine is None:
            return jsonify({"error": "Database not configured"}), 503
        data = request.json or {}
        report_ids = data.get("ids", [])
        if not report_ids:
            return jsonify({"error": "No IDs provided"}), 400
        report_ids = [int(x) for x in report_ids]
        with db_engine.begin() as conn:
            conn.execute(text("DELETE FROM user_reports WHERE id = ANY(:ids)"), {"ids": report_ids})
        return jsonify({"ok": True})
    except (SQLAlchemyError, ValueError) as e:
        print(f"[DB] Failed to bulk delete reports: {e}")
        return jsonify({"error": "failed to bulk delete reports"}), 500


def extract_first_url(text_value):
    match = URL_REGEX.search(str(text_value or ""))
    if not match:
        return None
    found = match.group(0).strip()
    if found.lower().startswith("www."):
        return f"https://{found}"
    return found

def check_url_with_google(url):
    """Check URL with Google Safe Browsing API v4. Returns dict or None if not configured."""
    api_key = os.environ.get("GOOGLE_SAFE_BROWSING_API_KEY")
    if not api_key or not url:
        return None
    payload = {
        "client": {"clientId": "faktanesia", "clientVersion": "1.0"},
        "threatInfo": {
            "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
            "platformTypes": ["ANY_PLATFORM"],
            "threatEntryTypes": ["URL"],
            "threatEntries": [{"url": url}]
        }
    }
    try:
        resp = requests.post(
            f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={api_key}",
            json=payload,
            timeout=6
        )
        if resp.status_code == 200:
            data = resp.json()
            is_threat = bool(data.get("matches"))
            return {"is_threat": is_threat, "raw": data}
        else:
            print(f"[SafeBrowsing] HTTP {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        print(f"[SafeBrowsing] Error: {e}")
    return None

def log_url_check(url, result):
    if db_engine is None:
        return
    try:
        with db_engine.begin() as conn:
            conn.execute(
                text(
                    """
                    INSERT INTO url_checks (url, is_threat, raw_json)
                    VALUES (:url, :is_threat, :raw_json)
                    """
                ),
                {"url": url, "is_threat": bool(result.get("is_threat")) if result else None, "raw_json": json.dumps(result.get("raw")) if result else None},
            )
    except SQLAlchemyError as e:
        print(f"[DB] Failed to write url_checks: {e}")

def log_prediction_result(raw_text, is_hoax, confidence, category=None, user_claim=None):
    """Persist prediction result to user_reports for feedback loop."""
    if db_engine is None:
        return
    try:
        with db_engine.begin() as conn:
            conn.execute(
                text(
                    """
                    INSERT INTO user_reports (
                        text_content,
                        url_submitted,
                        ai_prediction,
                        ai_confidence,
                        category,
                        user_claim
                    ) VALUES (
                        :text_content,
                        :url_submitted,
                        :ai_prediction,
                        :ai_confidence,
                        :category,
                        :user_claim
                    )
                    """
                ),
                {
                    "text_content": raw_text,
                    "url_submitted": extract_first_url(raw_text),
                    "ai_prediction": "HOAX" if is_hoax else "REAL",
                    "ai_confidence": float(confidence),
                    "category": category,
                    "user_claim": user_claim,
                },
            )
    except SQLAlchemyError as e:
        print(f"[DB] Failed to write user_reports: {e}")

def bump_trending_title(title):
    """Upsert title usage counter in trending_hoaxes."""
    if db_engine is None:
        return
    normalized_title = re.sub(r'\s+', ' ', str(title or "").strip())[:300]
    if not normalized_title:
        return
    try:
        with db_engine.begin() as conn:
            updated = conn.execute(
                text(
                    """
                    UPDATE trending_hoaxes
                    SET search_count = search_count + 1,
                        last_searched_at = CURRENT_TIMESTAMP
                    WHERE hoax_title = :hoax_title
                    """
                ),
                {"hoax_title": normalized_title},
            )
            if updated.rowcount == 0:
                conn.execute(
                    text(
                        """
                        INSERT INTO trending_hoaxes (hoax_title, search_count, last_searched_at)
                        VALUES (:hoax_title, 1, CURRENT_TIMESTAMP)
                        """
                    ),
                    {"hoax_title": normalized_title},
                )
    except SQLAlchemyError as e:
        print(f"[DB] Failed to update trending_hoaxes: {e}")

init_database_engine()

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
        "Kembalikan HANYA JSON tanpa markdown dengan format:\n"
        "{\"is_hoax\": true/false, \"category\": \"Kesehatan|Keuangan|Politik|Bencana|SARA|Lainnya\", \"explanation\": \"penjelasan 1-2 kalimat Bahasa Indonesia\"}"
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
        "Kembalikan HANYA JSON tanpa markdown dengan format:\n"
        "{\"is_hoax\": true/false, \"category\": \"Kesehatan|Keuangan|Politik|Bencana|SARA|Lainnya\", \"explanation\": \"penjelasan 1-2 kalimat Bahasa Indonesia\"}"
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
    db_ok = False
    if db_engine is not None:
        try:
            with db_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            db_ok = True
        except SQLAlchemyError:
            db_ok = False
    return jsonify({
        "status": "healthy",
        "service": "FaktaNesia Hoax Detector v2",
        "model_loaded": model_pipeline is not None,
        "openrouter_active": os.environ.get("OPENROUTER_API_KEY") is not None,
        "gemini_fallback_active": os.environ.get("GEMINI_API_KEY") is not None,
        "database_configured": os.environ.get("DATABASE_URL") is not None,
        "database_connected": db_ok,
        "safe_browsing_configured": os.environ.get("GOOGLE_SAFE_BROWSING_API_KEY") is not None,
        "trigger_count": len(TRIGGER_DATABASE)
    })

@app.route('/trending-hoaxes', methods=['GET'])
def get_trending_hoaxes():
    if db_engine is None:
        return jsonify({"error": "Database not configured"}), 503
    limit = request.args.get('limit', default=10, type=int)
    limit = max(1, min(limit, 50))
    try:
        with db_engine.connect() as conn:
            rows = conn.execute(
                text(
                    """
                    SELECT hoax_title, search_count, last_searched_at
                    FROM trending_hoaxes
                    ORDER BY search_count DESC, last_searched_at DESC
                    LIMIT :limit
                    """
                ),
                {"limit": limit},
            ).mappings().all()

        return jsonify({
            "count": len(rows),
            "data": [
                {
                    "title": row["hoax_title"],
                    "search_count": row["search_count"],
                    "last_searched_at": str(row["last_searched_at"]),
                }
                for row in rows
            ],
        })
    except SQLAlchemyError as e:
        print(f"[DB] Failed to read trending_hoaxes: {e}")
        return jsonify({"error": "Failed to fetch trending hoaxes"}), 500

def map_trigger_category_to_high_level(trigger_cat):
    """Map granular trigger categories to high-level system categories."""
    trigger_cat = str(trigger_cat).strip()
    mapping = {
        "Health Misinformation": "Kesehatan",
        "Pseudoscience": "Kesehatan",
        "Penipuan Bantuan Sosial": "Keuangan",
        "Financial Lure": "Keuangan",
        "Investment Scam": "Keuangan",
        "Promising Rewards": "Keuangan",
        "Phishing Hook": "Keuangan",
        "Suspicious Promise": "Keuangan",
        "Lure": "Keuangan",
        "Lowongan Palsu": "Keuangan",
        "Political/Religious": "Politik",
        "Political Hoax": "Politik",
        "Impersonation": "Politik",
        "Disaster Hoax": "Bencana",
        "Isu Subsidi BBM": "Bencana",
        "Klaim Tanggal Palsu": "Bencana",
    }
    return mapping.get(trigger_cat, "Lainnya")

@app.route('/reports/similar', methods=['GET'])
def get_similar_reports():
    text_query = request.args.get('text', '').strip()
    if not text_query:
        return jsonify({"data": []})
    
    try:
        if db_engine is None:
            return jsonify({"data": []})
            
        with db_engine.connect() as conn:
            # Fetch last 150 user reports to compare
            rows = conn.execute(
                text("SELECT id, text_content, ai_prediction, category, created_at FROM user_reports ORDER BY created_at DESC LIMIT 150")
            ).mappings().all()
            
        similar_items = []
        normalized_query = normalize_text(text_query)
        for r in rows:
            content = r["text_content"]
            norm_content = normalize_text(content)
            
            # Compute a simple overlap ratio or difflib ratio
            ratio = difflib.SequenceMatcher(None, normalized_query, norm_content).ratio()
            if ratio >= 0.35: # 35% similarity threshold
                similar_items.append({
                    "id": r["id"],
                    "text_content": content,
                    "ai_prediction": r["ai_prediction"],
                    "category": r["category"] or "Umum",
                    "similarity": round(ratio * 100, 1),
                    "created_at": str(r["created_at"])
                })
                
        # Sort by similarity descending
        similar_items.sort(key=lambda x: x["similarity"], reverse=True)
        return jsonify({"data": similar_items[:3]}) # Return top 3
    except Exception as e:
        print(f"[ERROR] Similar search failed: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/reports/search', methods=['GET'])
def search_reports():
    query = request.args.get('query', '').strip()
    category = request.args.get('category', '').strip()
    limit = min(50, max(1, request.args.get('limit', 15, type=int)))
    offset = max(0, request.args.get('offset', 0, type=int))
    
    try:
        if db_engine is None:
            return jsonify({"total": 0, "data": []})
            
        sql_query = "SELECT id, text_content, url_submitted, ai_prediction, ai_confidence, category, created_at, review_note FROM user_reports WHERE 1=1"
        params = {"limit": limit, "offset": offset}
        
        if query:
            sql_query += " AND text_content ILIKE :query"
            params["query"] = f"%{query}%"
        if category and category.lower() != "semua":
            sql_query += " AND category ILIKE :category"
            params["category"] = category
            
        count_query = sql_query.replace("id, text_content, url_submitted, ai_prediction, ai_confidence, category, created_at, review_note", "COUNT(*) as cnt")
        
        sql_query += " ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
        
        with db_engine.connect() as conn:
            total_count = conn.execute(text(count_query), {k: v for k, v in params.items() if k not in ["limit", "offset"]}).scalar()
            rows = conn.execute(text(sql_query), params).mappings().all()
            
        return jsonify({
            "total": total_count,
            "data": [dict(r) for r in rows]
        })
    except Exception as e:
        print(f"[ERROR] Search failed: {e}")
        return jsonify({"error": str(e)}), 500

def check_komdigi_database(text_to_check):
    """Check if the text matches any known hoax in the komdigi_hoaks table."""
    if db_engine is None or not text_to_check.strip():
        return None
    try:
        normalized_query = normalize_text(text_to_check)
        with db_engine.connect() as conn:
            # Fetch recent 200 komdigi hoaxes to compare in Python
            rows = conn.execute(
                text("SELECT title, url, category FROM komdigi_hoaks ORDER BY scraped_at DESC LIMIT 200")
            ).mappings().all()
            
        best_match = None
        highest_ratio = 0.0
        
        for r in rows:
            title = r["title"]
            # Clean komdigi titles from [HOAKS] tags
            clean_title = re.sub(r'\[HOAKS\]|\[HOAX\]|\[SALAH\]|\[FITNAH\]', '', title, flags=re.IGNORECASE)
            normalized_title = normalize_text(clean_title)
            
            ratio = difflib.SequenceMatcher(None, normalized_query, normalized_title).ratio()
            if ratio > highest_ratio:
                highest_ratio = ratio
                best_match = r
                
        # If similarity is above 72%
        if highest_ratio >= 0.72:
            return {
                "title": best_match["title"],
                "url": best_match["url"],
                "category": best_match["category"],
                "similarity": round(highest_ratio * 100, 1)
            }
    except Exception as e:
        print(f"[DB] Komdigi check failed: {e}")
    return None

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
    user_claim = data.get('user_claim')
    normalized = normalize_text(raw_text)
    cleaned = clean_text(raw_text)

    if not normalized.strip():
        return jsonify({"error": "Empty text input"}), 400

    try:
        first_url = extract_first_url(raw_text)
        url_safety = None
        credibility_data = None
        if first_url:
            url_safety = check_url_with_google(first_url)
            log_url_check(first_url, url_safety)
            credibility_data = credibility_manager.check_domain_credibility(first_url)

        # ─── LAYER 0.5: Verified Database Cache & Admin Overrides ────────
        if db_engine is not None:
            try:
                with db_engine.connect() as conn:
                    matched_reports = conn.execute(
                        text("""
                            SELECT id, text_content, ai_prediction, ai_confidence, category, reviewed, review_note 
                            FROM user_reports 
                            WHERE LOWER(TRIM(text_content)) = :normalized
                            ORDER BY reviewed DESC, created_at DESC
                        """),
                        {"normalized": normalized.strip()}
                    ).mappings().all()
                    
                    if matched_reports:
                        best_report = matched_reports[0]
                        is_hoax = best_report["ai_prediction"] == "HOAX"
                        if is_hoax:
                            bump_trending_title(raw_text)
                        
                        source = "Verifikasi Admin FaktaNesia" if best_report["reviewed"] else "Database Histori/Sesi FaktaNesia"
                        explanation = best_report["review_note"] if best_report["reviewed"] else f"Sistem telah mendeteksi laporan serupa sebelumnya dan mengonfirmasinya sebagai {'HOAX' if is_hoax else 'FAKTA'}."
                        
                        return jsonify({
                            "is_hoax": is_hoax,
                            "hoax_probability": 1.0 if is_hoax else 0.0,
                            "confidence_score": 1.0 if best_report["reviewed"] else (best_report["ai_confidence"] or 0.95),
                            "label": "HOAX" if is_hoax else "REAL",
                            "category": best_report["category"] or "Lainnya",
                            "triggers": [],
                            "ai_explanation": explanation or f"Laporan ini telah dianalisis sebagai {'HOAX' if is_hoax else 'FAKTA'}.",
                            "ai_source": source,
                            "url_checked": first_url,
                            "url_safety": url_safety,
                            "domain_credibility": credibility_data,
                            "komdigi_match": None,
                            "cached": True
                        })
            except Exception as e:
                print(f"[DB] Cache check failed: {e}")

        # ─── LAYER 1: ML Model Base Prediction ───────────────────────────
        prediction_prob = model_pipeline.predict_proba([cleaned])[0]
        hoax_probability = float(prediction_prob[1])

        # ─── LAYER 2: Fuzzy Heuristic Booster ────────────────────────────
        detected_triggers = detect_fuzzy_triggers(normalized, threshold=0.82)
        total_boost = sum(t.get("boost", 0.25) for t in detected_triggers)

        category = "Lainnya"
        if detected_triggers:
            cat_counts = {}
            for t in detected_triggers:
                hl_cat = map_trigger_category_to_high_level(t["category"])
                cat_counts[hl_cat] = cat_counts.get(hl_cat, 0) + 1
            category = max(cat_counts, key=cat_counts.get)

        if total_boost > 0:
            print(f"[Heuristic] Total boost: {total_boost:.2f} | Triggers: {[t['word'] for t in detected_triggers]}")
            hoax_probability = min(0.99, hoax_probability + total_boost)

        clean_triggers = [{"word": t["word"], "category": t["category"]} for t in detected_triggers]

        # Re-evaluate is_hoax based on the new probability from Layer 1, 2, and 2.5
        is_hoax = bool(hoax_probability > 0.5)
        confidence = hoax_probability if is_hoax else (1 - hoax_probability)

        # ─── LAYER 2.7: Komdigi Database Reference Checker ───────────────
        komdigi_match = check_komdigi_database(raw_text)
        
        if komdigi_match:
            is_hoax = True
            hoax_probability = 1.0
            confidence = 0.99
            ai_explanation = f"Konten teridentifikasi sebagai HOAX oleh aduan resmi Kominfo/Komdigi dengan tingkat kecocokan {komdigi_match['similarity']}%: '{komdigi_match['title']}'."
            ai_source = "Klarifikasi Resmi Kominfo"
            if komdigi_match.get("category"):
                category = "Politik" if "politik" in komdigi_match["category"].lower() else "Kesehatan" if "sehat" in komdigi_match["category"].lower() else "Keuangan" if "ekonomi" in komdigi_match["category"].lower() else "Lainnya"

        # ─── LAYER 3: AI Hybrid (OpenRouter primary → Gemini fallback) ───
        ai_explanation_val = None
        ai_source_val = None

        if not komdigi_match:
            ai_result = check_with_openrouter(raw_text)
            if ai_result is not None:
                ai_source_val = "OpenRouter Llama 3.3 70B"
            else:
                ai_result = check_with_gemini(raw_text)
                if ai_result is not None:
                    ai_source_val = "Google Gemini Flash"

            if ai_result is not None:
                is_hoax = bool(ai_result.get("is_hoax", is_hoax))
                ai_explanation_val = ai_result.get("explanation")
                confidence = 0.97
                ai_cat = ai_result.get("category")
                if ai_cat in ["Kesehatan", "Keuangan", "Politik", "Bencana", "SARA", "Lainnya"]:
                    category = ai_cat
        else:
            ai_explanation_val = ai_explanation
            ai_source_val = ai_source

        # Persist prediction and trending after final decision is computed.
        log_prediction_result(raw_text, is_hoax, confidence, category, user_claim)
        if is_hoax:
            bump_trending_title(raw_text)

        return jsonify({
            "is_hoax": is_hoax,
            "hoax_probability": round(hoax_probability, 4),
            "confidence_score": round(confidence, 4),
            "label": "HOAX" if is_hoax else "REAL",
            "category": category,
            "triggers": clean_triggers,
            "ai_explanation": ai_explanation_val,
            "ai_source": ai_source_val,
            "url_checked": first_url,
            "url_safety": url_safety,
            "domain_credibility": credibility_data,
            "komdigi_match": komdigi_match
        })

    except Exception as e:
        print(f"[ERROR] {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5001, debug=True)
