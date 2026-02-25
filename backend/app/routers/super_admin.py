from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
from sqlalchemy import func, desc

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
    SubscriptionPlanCreate,
    SubscriptionPlanUpdate,
    SubscriptionPlanResponse,
    MaintenanceModeResponse,
    MaintenanceModeUpdate,
)
from app.schemas.auth import TokenResponse
from app.core.admin_guard import require_super_admin
from app.core.security import create_access_token
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
    get_plans,
    create_plan,
    update_plan,
)
from app.models.company import Company
from app.models.user import User, UserRole
from app.models.audit_log import AuditLog
from app.models.invoice import Invoice
from fastapi import HTTPException
from app.core.maintenance import is_maintenance_mode, set_maintenance_mode

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
    new_end: date | None = None,
    plan_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    if not new_end and not plan_id:
        raise HTTPException(status_code=400, detail="Must provide either new_end or plan_id")
    company = db.query(Company).get(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return extend_subscription(db, company, new_end, plan_id, current_user.id)


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
    is_super_admin: bool | None = None,
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

    if is_super_admin is not None:
        if is_super_admin:
            query = query.filter(User.legacy_role == UserRole.SUPER_ADMIN.value)
        else:
            query = query.filter(User.legacy_role != UserRole.SUPER_ADMIN.value)

    return query.order_by(AuditLog.created_at.desc())\
        .limit(100)\
        .all()


@router.get("/analytics")
def get_platform_analytics(
    db: Session = Depends(get_db),
    _=Depends(require_super_admin),
):
    # Base Stats
    total_companies = db.query(Company).count()
    active_companies = db.query(Company).filter(Company.is_active == True).count()
    total_users = db.query(User).count()
    
    # MRR Estimate (rough average of ₹833/month per active company)
    total_mrr = active_companies * 833
    
    # Top Usage Companies (by Invoice Count)
    top_companies_query = (
        db.query(Company.name, func.count(Invoice.id).label("invoice_count"))
        .join(Invoice, Invoice.company_id == Company.id)
        .group_by(Company.id)
        .order_by(desc("invoice_count"))
        .limit(5)
        .all()
    )
    top_companies = [{"company_name": row.name, "invoice_count": row.invoice_count} for row in top_companies_query]

    # Growth Trends (last 6 months)
    six_months_ago = datetime.utcnow() - timedelta(days=180)
    recent_companies = db.query(Company.created_at).filter(Company.created_at >= six_months_ago).all()
    
    months_dict = {}
    # Pre-fill last 6 months
    for i in range(5, -1, -1):
        dt = datetime.utcnow() - timedelta(days=30*i)
        month_label = dt.strftime("%b") # e.g., 'Jan', 'Feb'
        months_dict[month_label] = 0
        
    for comp in recent_companies:
        if comp[0]:
            lbl = comp[0].strftime("%b")
            if lbl in months_dict:
                months_dict[lbl] += 1
                
    growth_trends = [{"month": k, "new_companies": v} for k, v in months_dict.items()]

    return {
        "summary": {
            "total_companies": total_companies,
            "active_companies": active_companies,
            "total_mrr": total_mrr,
            "total_users": total_users,
        },
        "growth_trends": growth_trends,
        "usage_metrics": top_companies,
    }

# =========================
# SUBSCRIPTION PLANS CRUD
# =========================

@router.get("/plans", response_model=list[SubscriptionPlanResponse])
def get_plans_api(
    db: Session = Depends(get_db),
    _=Depends(require_super_admin),
):
    return get_plans(db)

@router.post("/plans", response_model=SubscriptionPlanResponse)
def create_plan_api(
    data: SubscriptionPlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    return create_plan(db, data, current_user.id)

@router.patch("/plans/{plan_id}", response_model=SubscriptionPlanResponse)
def update_plan_api(
    plan_id: int,
    data: SubscriptionPlanUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    return update_plan(db, plan_id, data, current_user.id)

@router.get("/maintenance", response_model=MaintenanceModeResponse)
def get_maintenance_status_api(
    _=Depends(require_super_admin),
):
    return {"is_maintenance": is_maintenance_mode()}

@router.post("/maintenance", response_model=MaintenanceModeResponse)
def set_maintenance_status_api(
    data: MaintenanceModeUpdate,
    _=Depends(require_super_admin),
):
    set_maintenance_mode(data.is_maintenance)
    return {"is_maintenance": data.is_maintenance}

@router.post("/impersonate/{company_id}", response_model=TokenResponse)
def impersonate_tenant_api(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    # Find active COMPANY_ADMIN for this company
    target_admin = db.query(User).filter(
        User.company_id == company_id,
        User.legacy_role == UserRole.COMPANY_ADMIN.value,
        User.is_active == True
    ).first()

    if not target_admin:
        raise HTTPException(status_code=404, detail="No active Company Admin found for this tenant.")

    if not target_admin.company.is_active:
        raise HTTPException(status_code=403, detail="Company is currently deactivated.")

    # Create Impersonation Token
    token = create_access_token(
        data={
            "user_id": target_admin.id,
            "name": f"{target_admin.name} (Impersonated)",
            "company_id": target_admin.company_id,
            "role": target_admin.legacy_role,
            "role_name": target_admin.role.name if target_admin.role else None,
            "company_name": target_admin.company.name if target_admin.company else None,
            "is_impersonated": True,
        }
    )

    # Log the action under Super Admin's ID
    audit = AuditLog(
        user_id=current_user.id,
        action="IMPERSONATE",
        details=f"Super Admin {current_user.name} impersonated {target_admin.company.name}",
        company_id=company_id
    )
    db.add(audit)
    db.commit()

    return TokenResponse(access_token=token)
