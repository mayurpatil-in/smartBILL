import os
import sys

sys.path.append(os.path.join(os.getcwd(), "backend"))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.getcwd(), "backend", ".env"))

from app.core.config import settings
import hmac
import hashlib

def create_url_signature(data: str) -> str:
    return hmac.new(
        settings.JWT_SECRET_KEY.encode(),
        data.encode(),
        hashlib.sha256
    ).hexdigest()

if __name__ == "__main__":
    sig = create_url_signature("111")
    print(f"http://127.0.0.1:8000/public/challan/111/download?token={sig}")
