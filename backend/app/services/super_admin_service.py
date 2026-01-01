from sqlalchemy.orm import Session
from datetime import date

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
    
    log_audit_action(db, admin_id, "CREATE_ADMIN", company_id, f"Created admin {user.email}")
    
    return user


def extend_subscription(
    db: Session,
    company: Company,
    new_end: date,
    admin_id: int,
):
    company.subscription_end = new_end
    db.commit()
    db.refresh(company)
    
    log_audit_action(db, admin_id, "EXTEND_SUBSCRIPTION", company.id, f"Extended to {new_end}")

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
