from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog

def log_audit_action(
    db: Session,
    user_id: int,
    action: str,
    company_id: int = None,
    details: str = None,
    ip_address: str = None
):
    log = AuditLog(
        user_id=user_id,
        action=action,
        company_id=company_id,
        details=details,
        ip_address=ip_address
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log
