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

def hash_password(password: str) -> str:
    """
    Hash plain password using bcrypt
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify plain password against hashed password
    """
    return pwd_context.verify(plain_password, hashed_password)


# ==================================================
# JWT TOKEN UTILS
# ==================================================

def create_access_token(data: dict, remember: bool = False) -> str:
    """
    Create JWT access token

    remember=True  -> long session
    remember=False -> short session
    """
    to_encode = data.copy()

    minutes = (
        settings.ACCESS_TOKEN_REMEMBER_MINUTES
        if remember
        else settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )

    expire = datetime.utcnow() + timedelta(minutes=minutes)

    to_encode.update({
        "sub": str(data.get("user_id")),
        "exp": expire,
        "iat": datetime.utcnow()
    })

    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )

    return encoded_jwt
