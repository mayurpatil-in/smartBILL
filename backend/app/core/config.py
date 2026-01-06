from typing import Any
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ================= BASIC =================
    PROJECT_NAME: str = "SmartBILL System"

    # ================= DATABASE =================
    DATABASE_URL: str

    # ================= JWT =================
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"

    # ================= TOKEN EXPIRY =================
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60       # 1 hour
    ACCESS_TOKEN_REMEMBER_MINUTES: int = 10080   # 7 days

    # ================= SYSTEM =================
    BACKEND_URL: str | None = None

    # ✅ REQUIRED FOR PYDANTIC v2
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="allow",   # 🔑 prevents env validation crashes
    )
    
    # ================= CORS =================
    cors_origins: list[str] | str = ["*"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Any) -> list[str]:
        if isinstance(v, str) and not v.strip().startswith("["):
            return [i.strip() for i in v.split(",")]
        return v


settings = Settings()

import socket

def get_backend_url() -> str:
    """
    Returns the backend URL for QR codes and external links.
    Priority:
    1. ENV VAR: BACKEND_URL (Explicit override for Production)
    2. LAN IP: http://192.168.x.x:8000 (Auto-detected for Local Dev)
    3. LOCALHOST: http://localhost:8000 (Fallback)
    """
    # 1. Check Env Var (Highest Priority)
    if settings.BACKEND_URL and "localhost" not in settings.BACKEND_URL:
         return settings.BACKEND_URL.rstrip("/")

    # 2. Detect LAN IP (For local network testing if no remote URL set)
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        # Doesn't actually connect, just determines route
        s.connect(("8.8.8.8", 80))
        lan_ip = s.getsockname()[0]
        s.close()
        return f"http://{lan_ip}:8000"
    except Exception:
        pass

    # 3. Last Resort Fallback (or if Env is localhost)
    if settings.BACKEND_URL:
        return settings.BACKEND_URL.rstrip("/")

    return "http://localhost:8000"
