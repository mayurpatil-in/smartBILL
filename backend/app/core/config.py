from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "SmartBILL System"

    DATABASE_URL: str

    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"

    # 🔐 Token expiry
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60        # 1 hour
    ACCESS_TOKEN_REMEMBER_MINUTES: int = 10080   # 7 days

    class Config:
        env_file = ".env"


settings = Settings()
