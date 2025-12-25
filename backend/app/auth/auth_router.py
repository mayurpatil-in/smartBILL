from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.schemas.auth import LoginRequest, TokenResponse
from app.database.session import get_db
from app.models.user import User
from app.core.security import verify_password, create_access_token

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate user and return JWT access token.
    Supports 'Remember Me' for long-lived sessions.
    """

    # 1️⃣ Find active user by email
    user = (
        db.query(User)
        .filter(
            User.email == data.email,
            User.is_active == True
        )
        .first()
    )

    # 2️⃣ Validate credentials
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # 3️⃣ Create JWT token (remember = long expiry)
    access_token = create_access_token(
        data={
            "user_id": user.id,
            "company_id": user.company_id,
            "role": user.role
        },
        remember=data.remember
    )

    # 4️⃣ Return token
    return TokenResponse(
        access_token=access_token
    )
