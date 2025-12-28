from sqlalchemy.orm import Session
from datetime import date

from app.models.company import Company
from app.models.user import User, UserRole
from app.core.security import get_password_hash


def create_company(db: Session, data):
    company = Company(
        name=data.name,
        gst_number=data.gst_number,
        email=data.email,
        phone=data.phone,
        subscription_start=data.subscription_start,
        subscription_end=data.subscription_end,
        is_active=True,
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


from fastapi import HTTPException, status

def create_company_admin(
    db: Session,
    company_id: int,
    data,
):
    existing_user = db.query(User).filter(User.email == data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )

    user = User(
        name=data.name,
        email=data.email,
        password_hash=get_password_hash(data.password),
        role=UserRole.COMPANY_ADMIN,  # Explicitly using COMPANY_ADMIN
        company_id=company_id,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def extend_subscription(
    db: Session,
    company: Company,
    new_end: date,
):
    company.subscription_end = new_end
    db.commit()
    db.refresh(company)
    return company


def toggle_company_status(db: Session, company: Company):
    company.is_active = not company.is_active
    db.commit()
    db.refresh(company)
    return company
