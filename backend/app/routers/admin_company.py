from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date, timedelta

from app.database.session import get_db
from app.models.company import Company
from app.schemas.company import CompanyCreate
from app.core.admin_guard import require_super_admin

router = APIRouter(
    prefix="/admin/companies",
    tags=["Super Admin"],
)


@router.get("/")
def list_companies(
    db: Session = Depends(get_db),
    _: str = Depends(require_super_admin),
):
    return db.query(Company).order_by(Company.created_at.desc()).all()


@router.post("/")
def create_company(
    data: CompanyCreate,
    db: Session = Depends(get_db),
    _: str = Depends(require_super_admin),
):
    company = Company(
        name=data.name,
        email=data.email,
        phone=data.phone,
        subscription_start=date.today(),
        subscription_end=date.today() + timedelta(days=data.plan_days),
        is_active=True,
    )

    db.add(company)
    db.commit()
    db.refresh(company)

    return company


@router.post("/{company_id}/extend")
def extend_subscription(
    company_id: int,
    days: int,
    db: Session = Depends(get_db),
    _: str = Depends(require_super_admin),
):
    company = db.query(Company).get(company_id)

    company.subscription_end += timedelta(days=days)
    company.is_active = True

    db.commit()
    return {"message": "Subscription extended"}
