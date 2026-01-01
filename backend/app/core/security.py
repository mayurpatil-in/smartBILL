from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

# ==================================================
# PASSWORD UTILS
# ==================================================

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


# ==================================================
# JWT TOKEN UTILS (FIXED)
# ==================================================

def create_access_token(*, data: dict, remember: bool = False) -> str:
    to_encode = data.copy()

    minutes = (
        settings.ACCESS_TOKEN_REMEMBER_MINUTES
        if remember
        else settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )

    expire = datetime.utcnow() + timedelta(minutes=minutes)

    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
    })

    return jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )


# ==================================================
# URL SIGNING UTILS (HMAC)
# ==================================================
import hmac
import hashlib

def create_url_signature(data: str) -> str:
    """Generate HMAC signature for public URLs"""
    return hmac.new(
        settings.JWT_SECRET_KEY.encode(),
        data.encode(),
        hashlib.sha256
    ).hexdigest()

def verify_url_signature(data: str, signature: str) -> bool:
    """Verify the signature matches data"""
    expected = create_url_signature(data)
    return hmac.compare_digest(expected, signature)
