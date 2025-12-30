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
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60        # 1 hour
    ACCESS_TOKEN_REMEMBER_MINUTES: int = 10080   # 7 days

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
