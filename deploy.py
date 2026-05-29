from huggingface_hub import HfApi
import os
from dotenv import load_dotenv
load_dotenv()

api = HfApi()
token = os.getenv("HF_TOKEN")
repo_id = "darell123/faktanesia-backend"

try:
#    print("Uploading model...")
#    api.upload_file(
#        path_or_fileobj="model/hoax_model.pkl",
#        path_in_repo="model/hoax_model.pkl",
#        repo_id=repo_id,
#        repo_type="space",
#        token=token
#    )
    print("Uploading app.py...")
    api.upload_file(
        path_or_fileobj="app.py",
        path_in_repo="app.py",
        repo_id=repo_id,
        repo_type="space",
        token=token
    )
    print("Uploading credibility_manager.py...")
    api.upload_file(
        path_or_fileobj="credibility_manager.py",
        path_in_repo="credibility_manager.py",
        repo_id=repo_id,
        repo_type="space",
        token=token
    )
    print("Uploading requirements.txt...")
    api.upload_file(
        path_or_fileobj="requirements.txt",
        path_in_repo="requirements.txt",
        repo_id=repo_id,
        repo_type="space",
        token=token
    )
    print("Upload complete!")
except Exception as e:
    print("Error:", e)
