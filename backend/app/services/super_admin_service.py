from sqlalchemy.orm import Session
from datetime import date, timedelta

from app.models.subscription_plan import SubscriptionPlan

from app.models.company import Company
from app.models.company import Company
from app.models.user import User, UserRole
from app.models.party import Party
from app.models.item import Item
from app.models.invoice import Invoice
from app.models.delivery_challan import DeliveryChallan
from app.models.party_challan import PartyChallan
from app.models.employee_profile import EmployeeProfile
from app.models.audit_log import AuditLog
from app.core.security import get_password_hash
from app.services.audit_service import log_audit_action


from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status

def create_company(db: Session, data, admin_id: int):
    try:
        sub_start = data.subscription_start or date.today()
        sub_end = data.subscription_end or (sub_start + timedelta(days=365))
        
        plan_id = data.plan_id
        if plan_id:
            plan = db.query(SubscriptionPlan).get(plan_id)
            if plan:
                sub_end = sub_start + timedelta(days=plan.duration_days)

        company = Company(
            name=data.name,
            gst_number=data.gst_number,
            email=data.email,
            phone=data.phone,
            subscription_start=sub_start,
            subscription_end=sub_end,
            is_active=True,
            plan_id=plan_id,
        )
        db.add(company)
        db.commit()
        db.refresh(company)
        
        log_audit_action(db, admin_id, "CREATE_COMPANY", company.id, f"Created company {company.name}")
        
        return company
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Company with this GST Number already exists"
        )


from fastapi import HTTPException, status

def create_company_admin(
    db: Session,
    company_id: int,
    data,
    admin_id: int,
):
    # Check if company exists
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    # Check if user with email already exists
    existing_user = db.query(User).filter(User.email == data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Get the "Company Admin" system role
    from app.models.role import Role
    company_admin_role = db.query(Role).filter(
        Role.name == "Company Admin",
        Role.is_system_role == True
    ).first()
    
    if not company_admin_role:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Company Admin role not found in system. Please run database migrations."
        )

    # Create new admin user with RBAC role
    user = User(
        name=data.name,
        email=data.email,
        password_hash=get_password_hash(data.password),
        role_id=company_admin_role.id,  # Use new RBAC system
        legacy_role="COMPANY_ADMIN",     # For backward compatibility
        company_id=company_id,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    log_audit_action(db, admin_id, "CREATE_ADMIN", company_id, f"Created admin {user.email}")
    
    return user


def extend_subscription(
    db: Session,
    company: Company,
    new_end: date | None,
    plan_id: int | None,
    admin_id: int,
):
    if plan_id:
        plan = db.query(SubscriptionPlan).get(plan_id)
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found")
        company.plan_id = plan.id
        
        # Calculate new end date securely: from today OR existing end (whichever is later)
        start_date = max(date.today(), company.subscription_end)
        company.subscription_end = start_date + timedelta(days=plan.duration_days)
    elif new_end:
        company.subscription_end = new_end
        
    db.commit()
    db.refresh(company)
    
    log_audit_action(db, admin_id, "EXTEND_SUBSCRIPTION", company.id, f"Extended to {company.subscription_end}")

    return company


def toggle_company_status(db: Session, company: Company, admin_id: int):
    company.is_active = not company.is_active
    db.commit()
    db.refresh(company)
    
    status_str = "Activated" if company.is_active else "Deactivated"
    log_audit_action(db, admin_id, "TOGGLE_STATUS", company.id, f"{status_str} company")

    return company


def update_company(db: Session, company: Company, data, admin_id: int):
    if data.name is not None:
        company.name = data.name
    if data.gst_number is not None:
        company.gst_number = data.gst_number
    if data.email is not None:
        company.email = data.email
    if data.phone is not None:
        company.phone = data.phone
    
    db.commit()
    db.refresh(company)
    
    log_audit_action(db, admin_id, "UPDATE_COMPANY", company.id, "Updated details")

    return company


def reset_admin_password(db: Session, company_id: int, email: str, new_password: str, admin_id: int):
    user = db.query(User).filter(
        User.company_id == company_id,
        User.email == email
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in this company"
        )
    
    user.password_hash = get_password_hash(new_password)
    db.commit()
    
    log_audit_action(db, admin_id, "RESET_PASSWORD", company_id, f"Reset password for {email}")

    return {"message": "Password updated successfully"}


def delete_company_safely(db: Session, company_id: int, admin_id: int):
    company = db.query(Company).get(company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    # Check for dependencies
    dependencies = [
        ("Parties", db.query(Party).filter(Party.company_id == company_id).count()),
        ("Items", db.query(Item).filter(Item.company_id == company_id).count()),
        ("Invoices", db.query(Invoice).filter(Invoice.company_id == company_id).count()),
        ("Delivery Challans", db.query(DeliveryChallan).filter(DeliveryChallan.company_id == company_id).count()),
        ("Party Challans", db.query(PartyChallan).filter(PartyChallan.company_id == company_id).count()),
        ("Employees", db.query(EmployeeProfile).join(User).filter(User.company_id == company_id).count()),
    ]
    
    active_deps = [f"{count} {name}" for name, count in dependencies if count > 0]
    
    if active_deps:
        detail_msg = "Cannot delete company. Existing data found: " + ", ".join(active_deps)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail_msg
        )
    
    # Safe to delete (Cascade will handle Users/Settings usually, but here we can be explicit if needed)
    # Note: Users usually cascade delete, but if we want to be safe we could delete them first.
    # We will trust cascading for Users as they are direct children.

    # 🛑 Manually delete Audit Logs related to this company or its users
    # This is required because AuditLog has a foreign key to Company/User and we are about to delete them.
    # We want to clear the logs associated with this tenant.
    
    # Get all user IDs for this company
    user_ids = db.query(User.id).filter(User.company_id == company_id).all()
    user_ids = [uid[0] for uid in user_ids]

    if user_ids:
        db.query(AuditLog).filter(
            (AuditLog.company_id == company_id) | 
            (AuditLog.user_id.in_(user_ids))
        ).delete(synchronize_session=False)
    else:
        db.query(AuditLog).filter(AuditLog.company_id == company_id).delete(synchronize_session=False)

    db.delete(company)
    db.commit()
    
    log_audit_action(db, admin_id, "DELETE_COMPANY", None, f"Deleted company {company.name} (ID: {company_id}) safely")
    
    return {"message": "Company deleted successfully"}


def get_plans(db: Session):
    return db.query(SubscriptionPlan).order_by(SubscriptionPlan.price).all()

def create_plan(db: Session, data, admin_id: int):
    # Add simple handling for passing raw data dict vs parsed pydantic model
    plan_data = data.model_dump() if hasattr(data, "model_dump") else data
    plan = SubscriptionPlan(**plan_data)
    db.add(plan)
    db.commit()
    db.refresh(plan)
    log_audit_action(db, admin_id, "CREATE_PLAN", plan.id, f"Created plan {plan.name}")
    return plan

def update_plan(db: Session, plan_id: int, data, admin_id: int):
    plan = db.query(SubscriptionPlan).get(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    update_data = data.model_dump(exclude_unset=True) if hasattr(data, "model_dump") else data
    for key, value in update_data.items():
        setattr(plan, key, value)
        
    db.commit()
    db.refresh(plan)
    log_audit_action(db, admin_id, "UPDATE_PLAN", plan.id, f"Updated plan {plan.name}")
    return plan
