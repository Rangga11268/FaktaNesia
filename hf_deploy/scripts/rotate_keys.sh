#!/usr/bin/env bash
set -euo pipefail

echo "FaktaNesia — Helper: Rotate API Keys Guidance"
echo
echo "This script does NOT rotate keys automatically. It prints recommended CLI steps to rotate common services."
echo
echo "1) Hugging Face (update HF_TOKEN secret):"
echo "   - Create new HF token at https://huggingface.co/settings/tokens"
echo "   - Update Space secret via web UI: Settings -> Secrets -> New secret"
echo
echo "2) Supabase/Postgres (rotate DB user password):"
echo "   - In Supabase console, go to Settings -> Database -> Credentials -> Regenerate password or create new user"
echo "   - Update your DATABASE_URL in deployment secrets"
echo
echo "3) Google Safe Browsing / Gemini / OpenRouter:" 
echo "   - Revoke old API key in provider console and create new API key"
echo "   - Update environment variables in deployment (Vercel, Netlify, HF, GitHub Secrets)"
echo
echo "Example: set in CI (GitHub Actions)"
echo "  - name: Set secrets"
echo "    run: |"
echo "      echo \"DATABASE_URL=$DATABASE_URL\" >> $GITHUB_ENV"
echo
echo "After replacing secrets, test locally:\n  python scripts/init_db.py && python -c \"from app import app; print(app.test_client().get('/health').json)\""

exit 0
