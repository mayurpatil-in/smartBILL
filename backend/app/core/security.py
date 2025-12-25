from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

# 🔐 Hash password
def hash_password(password: str) -> str:
    return pwd_context.hash(password)


# 🔍 Verify password
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


# 🎟️ Create JWT access token
def create_access_token(data: dict, remember: bool = False):
    to_encode = data.copy()

    minutes = (
        settings.ACCESS_TOKEN_REMEMBER_MINUTES
        if remember
        else settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )

    expire = datetime.utcnow() + timedelta(minutes=minutes)

    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow()
    })

    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )

    return encoded_jwt
