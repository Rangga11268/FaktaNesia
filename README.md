# 🕵️ FaktaNesia — AI Hoax Detector Gazette

> **Sistem Deteksi Disinformasi & Pola Berita Hoax Berbasis Machine Learning dengan Estetika Neo-Brutalist Newspaper**

---

## 🌐 Live Demo / Tautan Aplikasi

Aplikasi ini telah dideploy secara penuh dan dapat dicoba secara langsung:
- **Aplikasi Utama (Vercel)**: [faktanesia.vercel.app](http://faktanesia.vercel.app/)
- **Layanan API Backend (Hugging Face Spaces)**: [darell123/faktanesia-backend](https://huggingface.co/spaces/darell123/faktanesia-backend)

---


## 📖 Deskripsi Proyek

**FaktaNesia** adalah aplikasi web modern yang didesain untuk mendeteksi disinformasi dan hoax dalam artikel berita maupun pesan berantai berbahasa Indonesia. Aplikasi ini menggabungkan model **Machine Learning (TF-IDF + Logistic Regression)** dengan akurasi tinggi serta antarmuka pengguna (UI/UX) bertema **Neo-Brutalist Newspaper** yang unik, memberikan pengalaman visual yang khas layaknya membaca kliping koran taktis tempo dulu.

---

## ✨ Fitur Utama

- **🧠 Deteksi Hoax AI Akurasi Tinggi**: Memindai naskah berita secara instan dengan pipeline model klasifikasi biner TF-IDF.
- **🔍 X-Ray Pattern Analysis**: Menyoroti kata pemicu (trigger words) yang sering digunakan dalam trik penipuan (seperti "klik link", "kuota gratis", "cair").
- **📸 Pindai Gambar (I-Scan)**: Mengekstrak teks dari gambar/screenshot chat WhatsApp atau cuplikan media sosial menggunakan OCR (Tesseract.js) untuk dianalisis langsung oleh AI.
- **📰 Estetika Neo-Brutalist Light**: Desain berkarakter bertema surat kabar cetak antik dengan palet kertas koran hangat (`#f5f4ef`), border tebal retro, stempel sensor stensil militer, dan tipografi surat kabar klasik (*DM Serif Display*).
- **🎮 Hoax Buster Quiz**: Widget kuis interaktif untuk melatih kepekaan pengguna terhadap berita palsu.

---

## 🛠️ Tech Stack

### Frontend (Klien)
- **Framework**: React.js dengan Vite
- **Styling**: Tailwind CSS & Vanilla CSS (Neo-Brutalist utility styling)
- **Animations**: Framer Motion
- **OCR Engine**: Tesseract.js (Client-side Image scanning)
- **Icons**: Lucide React

### Backend (Server API)
- **Framework**: Flask (Python)
- **ML Engine**: Scikit-Learn (TF-IDF Vectorizer + Logistic Regression)
- **Data Processor**: Pandas & Numpy

---

## 🧠 Detail Dataset & Akurasi Model

Model dilatih ulang menggunakan total **45.477 data sampel berita** berbahasa Indonesia dari portal berita kredibel (Real News) dan basis data klasifikasi Kominfo/TurnBackHoax (Hoax News).

| Kelas | Sumber Dataset |
|---|---|
| **Kredibel (Real)** | Antara News V3, Detik News V3, Kompas V3 |
| **Hoax / Dusta** | TurnBackHoax V3, Laporan Aduan Hoax Kominfo (Komdigi) |

### Performa Evaluasi Model
Model berhasil mencapai metrik performa luar biasa pada split test:
- **Akurasi Model**: `99.22%`
- **Precision (Presisi)**: `99.00%`
- **Recall (Sensitivitas)**: `99.00%`

---

## 🚀 Panduan Instalasi & Jalankan

### Prasyarat
- Python 3.8+
- Node.js 18+

### 1. Jalankan Backend (Flask)
```bash
# Pindah ke direktori utama proyek
cd FaktaNesia

# Buat & aktifkan virtual environment (opsional)
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependensi
pip install -r requirements.txt

# Latih model (opsional jika ingin retrain dengan 45k+ baris)
python scripts/train_hoax_model.py

# Jalankan server
python app.py
```
Server backend akan berjalan secara default di `http://127.0.0.1:5001`.

### 2. Jalankan Frontend (Vite)
```bash
# Masuk ke folder frontend
cd frontend

# Install modul NodeJS
npm install

# Jalankan server development
npm run dev
```
Buka `http://localhost:5173` di browser Anda untuk menggunakan aplikasi.

---

## 📝 Lisensi
Proyek ini dilisensikan di bawah **MIT License**.
