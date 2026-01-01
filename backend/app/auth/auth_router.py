from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from datetime import datetime, timezone, date

from app.schemas.auth import LoginRequest, TokenResponse
from app.database.session import get_db
from app.models.user import User
from app.core.security import verify_password, create_access_token
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# 🔐 LOGIN
@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = (
        db.query(User)
        .filter(
            User.email == data.email,
            User.is_active == True
        )
        .first()
    )

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # 🏢 CHECK COMPANY STATUS
    # 🏢 CHECK COMPANY STATUS
    if user.company_id and user.company:
        if not user.company.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your company account is suspended. Please contact support."
            )
        
        if user.company.subscription_end < date.today():
             raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your subscription plan has expired. Please renew."
            )

    token = create_access_token(
        data={
            "user_id": user.id,
            "name": user.name,                 # ✅ ADDED
            "company_id": user.company_id,     # None for SUPER_ADMIN
            "role": user.role.value,           # ✅ FIXED
            "company_name": user.company.name if user.company else None,
        },
        remember=data.remember
    )

    return TokenResponse(access_token=token)


# 🔁 REFRESH TOKEN
@router.post("/refresh", response_model=TokenResponse)
def refresh_token(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            options={"verify_exp": False}
        )

        exp = payload.get("exp")
        if not exp:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )

        expired_at = datetime.fromtimestamp(exp, tz=timezone.utc)
        now = datetime.now(timezone.utc)

        if (now - expired_at).total_seconds() > 600:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expired"
            )

        new_token = create_access_token(
            data={
                "user_id": payload["user_id"],
                "name": payload.get("name"),
                "company_id": payload.get("company_id"),
                "role": payload["role"],
                "company_name": payload.get("company_name"),
            }
        )

        return TokenResponse(access_token=new_token)

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

