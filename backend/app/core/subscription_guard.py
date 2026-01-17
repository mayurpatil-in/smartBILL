from datetime import date
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.session import get_db
from app.models.company import Company
from app.models.user import User, UserRole


def enforce_company_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # ✅ Super Admin bypass
    if current_user.legacy_role == UserRole.SUPER_ADMIN.value:
        return current_user

    company = db.query(Company).filter(
        Company.id == current_user.company_id
    ).first()

    if not company:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Company not found",
        )

    today = date.today()

    if not company.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Company is disabled. Contact Super Admin.",
        )

    if not (company.subscription_start <= today <= company.subscription_end):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Subscription expired. Please renew.",
        )

    return current_user
