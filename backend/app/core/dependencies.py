from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.session import get_db
from app.models.user import User
from app.models.financial_year import FinancialYear

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        user_id = payload.get("user_id")
        company_id = payload.get("company_id")

        if not user_id or not company_id:
            raise HTTPException(status_code=401, detail="Invalid token")

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(
        User.id == user_id,
        User.company_id == company_id,
        User.is_active == True
    ).first()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user



def get_company_id(
    current_user: User = Depends(get_current_user)
) -> int:
    # Central company isolation
    return current_user.company_id


def get_active_financial_year(
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
) -> FinancialYear:
    fy = db.query(FinancialYear).filter(
        FinancialYear.company_id == company_id,
        FinancialYear.is_active == True,
        FinancialYear.is_locked == False
    ).first()

    if not fy:
        raise HTTPException(
            status_code=400,
            detail="No active financial year"
        )

    return fy