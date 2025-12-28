from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date

from app.database.session import get_db
from app.schemas.super_admin import (
    CompanyCreate,
    CompanyResponse,
    CreateCompanyAdmin,
)
from app.core.role_guard import require_super_admin
from app.services.super_admin_service import (
    create_company,
    create_company_admin,
    extend_subscription,
    toggle_company_status,
)
from app.models.company import Company
from fastapi import HTTPException

router = APIRouter(
    prefix="/super-admin",
    tags=["Super Admin"],
)


@router.post("/companies", response_model=CompanyResponse)
def create_company_api(
    data: CompanyCreate,
    db: Session = Depends(get_db),
    _=Depends(require_super_admin),
):
    return create_company(db, data)


@router.post("/companies/{company_id}/admin")
def create_company_admin_api(
    company_id: int,
    data: CreateCompanyAdmin,
    db: Session = Depends(get_db),
    _=Depends(require_super_admin),
):
    return create_company_admin(db, company_id, data)


@router.patch("/companies/{company_id}/extend")
def extend_subscription_api(
    company_id: int,
    new_end: date,
    db: Session = Depends(get_db),
    _=Depends(require_super_admin),
):
    company = db.query(Company).get(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return extend_subscription(db, company, new_end)


@router.patch("/companies/{company_id}/toggle-status")
def toggle_status_api(
    company_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_super_admin),
):
    company = db.query(Company).get(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return toggle_company_status(db, company)


@router.get("/companies", response_model=list[CompanyResponse])
def list_companies(
    db: Session = Depends(get_db),
    _=Depends(require_super_admin),
):
    return db.query(Company).all()
