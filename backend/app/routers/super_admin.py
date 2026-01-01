from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date

from app.database.session import get_db
from app.schemas.super_admin import (
    CompanyCreate,
    CompanyResponse,
    CompanyCreate,
    CompanyResponse,
    CreateCompanyAdmin,
    CreateCompanyAdmin,
    CompanyUpdate,
    ResetPasswordRequest,
    AuditLogResponse,
)
from app.core.admin_guard import require_super_admin
from app.services.super_admin_service import (
    create_company,
    create_company_admin,
    extend_subscription,
    extend_subscription,
    toggle_company_status,
    toggle_company_status,
    update_company,
    update_company,
    update_company,
    reset_admin_password,
    delete_company_safely,
)
from app.models.company import Company
from app.models.user import User
from app.models.audit_log import AuditLog
from fastapi import HTTPException

router = APIRouter(
    prefix="/super-admin",
    tags=["Super Admin"],
)


@router.post("/companies", response_model=CompanyResponse)
def create_company_api(
    data: CompanyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    return create_company(db, data, current_user.id)


@router.patch("/companies/{company_id}", response_model=CompanyResponse)
def update_company_api(
    company_id: int,
    data: CompanyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    company = db.query(Company).get(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return update_company(db, company, data, current_user.id)


@router.delete("/companies/{company_id}")
def delete_company_api(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    return delete_company_safely(db, company_id, current_user.id)


@router.post("/companies/{company_id}/reset-password")
def reset_admin_password_api(
    company_id: int,
    data: ResetPasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    company = db.query(Company).get(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return reset_admin_password(db, company_id, data.email, data.new_password, current_user.id)


@router.post("/companies/{company_id}/admin")
def create_company_admin_api(
    company_id: int,
    data: CreateCompanyAdmin,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    return create_company_admin(db, company_id, data, current_user.id)


@router.patch("/companies/{company_id}/extend")
def extend_subscription_api(
    company_id: int,
    new_end: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    company = db.query(Company).get(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return extend_subscription(db, company, new_end, current_user.id)


@router.patch("/companies/{company_id}/toggle-status")
def toggle_status_api(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    company = db.query(Company).get(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return toggle_company_status(db, company, current_user.id)


@router.get("/companies", response_model=list[CompanyResponse])
def list_companies(
    db: Session = Depends(get_db),
    _=Depends(require_super_admin),
):
    return db.query(Company).all()


@router.get("/audit-logs", response_model=list[AuditLogResponse])
def get_audit_logs(
    company_id: int | None = None,
    db: Session = Depends(get_db),
    _=Depends(require_super_admin),
):
    query = db.query(
        AuditLog.id,
        AuditLog.action,
        AuditLog.details,
        AuditLog.created_at,
        User.name.label("user_name"),
        Company.name.label("company_name")
    ).join(User, AuditLog.user_id == User.id)\
     .outerjoin(Company, AuditLog.company_id == Company.id)

    if company_id:
        query = query.filter(AuditLog.company_id == company_id)

    return query.order_by(AuditLog.created_at.desc())\
        .limit(100)\
        .all()
