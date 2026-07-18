from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List
from ..database.session import get_db
from ..models.notification import Notification
from ..models.user import User
from ..core.dependencies import get_current_user
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(
    prefix="/notifications",
    tags=["notifications"],
)


# --- Schemas ---
class NotificationOut(BaseModel):
    id: int
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime
    company_id: int | None = None
    user_id: int | None = None

    class Config:
        from_attributes = True


# --- Routes ---

@router.get("/", response_model=List[NotificationOut])
def get_notifications(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Get recent notifications for the current user's company.
    Returns: company-specific + global (company_id=NULL) notifications.
    """
    notifications = (
        db.query(Notification)
        .filter(
            or_(
                Notification.company_id == user.company_id,   # This company's notifications
                Notification.company_id == None,               # Global/system notifications
            )
        )
        .order_by(Notification.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return notifications


@router.put("/{id}/read")
def mark_as_read(
    id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Mark a single notification as read."""
    notif = db.query(Notification).filter(
        Notification.id == id,
        or_(
            Notification.company_id == user.company_id,
            Notification.company_id == None,
        )
    ).first()

    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

    notif.is_read = True
    db.commit()
    return {"status": "success"}


@router.put("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Mark all unread notifications as read for this company."""
    db.query(Notification).filter(
        Notification.is_read == False,
        or_(
            Notification.company_id == user.company_id,
            Notification.company_id == None,
        )
    ).update({"is_read": True}, synchronize_session=False)
    db.commit()
    return {"status": "success"}


@router.delete("/clear-all")
def clear_all_notifications(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Delete all notifications for this company."""
    db.query(Notification).filter(
        or_(
            Notification.company_id == user.company_id,
            Notification.company_id == None,
        )
    ).delete(synchronize_session=False)
    db.commit()
    return {"status": "cleared"}

