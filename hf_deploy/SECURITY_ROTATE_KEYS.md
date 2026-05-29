# Rotasi Kunci API — FaktaNesia

Panduan singkat untuk merotasi/menyegarkan kunci API yang terekspos.

Langkah rekomendasi:

1. Identifikasi kunci yang terekspos (contoh: `OPENROUTER_API_KEY`, `GOOGLE_SAFE_BROWSING_API_KEY`, `DATABASE_URL`, `HF_TOKEN`).
2. Segera nonaktifkan (revoke) kunci lama melalui dashboard penyedia layanan.
3. Buat kunci baru.
4. Update variabel lingkungan pada deployment targets:
   - Supabase / Postgres: update `DATABASE_URL` pada dashboard Supabase.
   - Hugging Face: update secret `HF_TOKEN` di Settings -> Secrets.
   - Vercel / Netlify: update environment variables.
5. Simpan nilai baru secara lokal di file `.env` (yang ada di `.gitignore`) atau gunakan password manager.
6. Verifikasi layanan berjalan: jalankan `python scripts/init_db.py` lalu tes endpoint `/health`.

Contoh perintah (manual):

- Windows PowerShell (set env for current session):

```
$env:OPENROUTER_API_KEY = "sk_new_..."
$env:GOOGLE_SAFE_BROWSING_API_KEY = "AIzaSy..."
$env:HF_TOKEN = "hf_..."
```

- Bash (Linux/Mac/Cygwin/Git Bash):

```
export OPENROUTER_API_KEY="sk_new_..."
export GOOGLE_SAFE_BROWSING_API_KEY="AIzaSy..."
export HF_TOKEN="hf_..."
```

Catatan:

- Jangan pernah commit kunci ke VCS. Gunakan secrets di CI/CD.
- Jika kunci database bocor (contoh: `DATABASE_URL`) ganti kata sandi DB, buat user baru, perbarui URL, dan panggil `scripts/init_db.py`.

Jika mau, saya bisa menyiapkan skrip `scripts/rotate_keys.sh` yang menghasilkan instruksi CLI untuk layanan tertentu — beri tahu layanan mana yang ingin Anda rotasi otomatis.
