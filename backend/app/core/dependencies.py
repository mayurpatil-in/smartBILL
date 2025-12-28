from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from datetime import date

from app.core.config import settings
from app.database.session import get_db
from app.models.user import User, UserRole
from app.models.company import Company
from app.models.financial_year import FinancialYear

security = HTTPBearer()

# ============================================================
# 🔐 AUTHENTICATION (JWT → USER)
# ============================================================
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )

        user_id = payload.get("user_id")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    user = (
        db.query(User)
        .filter(
            User.id == user_id,
            User.is_active == True,
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    return user


# ============================================================
# 🧑 ROLE GUARD (REUSABLE & CLEAN)
# ============================================================
def require_role(*roles: UserRole):
    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user

    return checker


# ============================================================
# 🏢 COMPANY CONTEXT (BLOCK SUPER ADMIN)
# ============================================================
def get_company_id(
    current_user: User = Depends(get_current_user),
) -> int:
    if current_user.role == UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin does not operate under a company",
        )

    if not current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Company not assigned",
        )

    return current_user.company_id


# ============================================================
# ⏳ SUBSCRIPTION ENFORCEMENT (CRITICAL)
# ============================================================
def enforce_company_subscription(
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db),
) -> int:
    company = (
        db.query(Company)
        .filter(
            Company.id == company_id,
            Company.is_active == True,
        )
        .first()
    )

    if not company:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Company is inactive or not found",
        )

    today = date.today()

    if company.subscription_start > today:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Subscription not yet active",
        )

    if company.subscription_end < today:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Subscription expired. Please renew.",
        )

    return company_id


# ============================================================
# 📆 ACTIVE FINANCIAL YEAR (COMPANY USERS ONLY)
# ============================================================
def get_active_financial_year(
    company_id: int = Depends(enforce_company_subscription),
    db: Session = Depends(get_db),
) -> FinancialYear:
    fy = (
        db.query(FinancialYear)
        .filter(
            FinancialYear.company_id == company_id,
            FinancialYear.is_active == True,
            FinancialYear.is_locked == False,
        )
        .first()
    )

    if not fy:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active financial year",
        )

    return fy
