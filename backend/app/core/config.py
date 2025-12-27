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


settings = Settings()
