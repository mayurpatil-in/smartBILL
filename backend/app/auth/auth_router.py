from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from datetime import datetime, timezone, date

from app.schemas.auth import LoginRequest, TokenResponse
from app.database.session import get_db
from app.models.user import User
from app.core.security import verify_password, create_access_token
from app.core.security import verify_password, create_access_token
from app.core.config import settings
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from app.models.audit_log import AuditLog
from fastapi import Request

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Initialize Limiter (will reuse state from app.main if passed correctly, or create new local instance)
# Best practice: Import limiter instance from a core module, but for now we create a local one for DI.
limiter = Limiter(key_func=get_remote_address) 

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# 🔐 LOGIN
@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(request: Request, data: LoginRequest, db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload
    
    user = (
        db.query(User)
        .options(joinedload(User.role))  # Load role relationship
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
            "name": user.name,
            "company_id": user.company_id,     # None for SUPER_ADMIN
            "role": user.legacy_role,          # Use legacy_role for backward compatibility
            "role_name": user.role.name if user.role else None,  # Add actual role name
            "company_name": user.company.name if user.company else None,
        },
        remember=data.remember
    )

    # [SECURITY] Audit Log for Successful Login
    # Using a robust background task or direct insert
    try:
        audit = AuditLog(
            user_id=user.id,
            action="LOGIN",
            details=f"User {user.name} logged in successfully.",
            company_id=user.company_id
        )
        db.add(audit)
        db.commit()
    except Exception as e:
        print(f"Failed to write audit log: {e}")
        # Don't fail login if audit fails, but log error

    return TokenResponse(access_token=token)


# 🔁 REFRESH TOKEN
@router.post("/refresh", response_model=TokenResponse)
def refresh_token(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            options={"verify_exp": False}
        )

        user_id = payload.get("user_id")
        
        # [SECURITY FIX] Validate User Exists & Is Active
        user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is inactive or deleted"
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
                "user_id": user.id,
                "name": user.name,
                "company_id": user.company_id,
                "role": user.legacy_role,
                "role_name": user.role.name if user.role else None,
                "company_name": user.company.name if user.company else None,
            }
        )

        return TokenResponse(access_token=new_token)

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

