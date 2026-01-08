from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database.session import get_db
from ..models.notification import Notification
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

    class Config:
        from_attributes = True

# --- Routes ---

@router.get("/", response_model=List[NotificationOut])
def get_notifications(
    skip: int = 0, 
    limit: int = 20, 
    db: Session = Depends(get_db)
):
    """Get recent notifications ordered by date desc"""
    return db.query(Notification)\
        .order_by(Notification.created_at.desc())\
        .offset(skip)\
        .limit(limit)\
        .all()

@router.put("/{id}/read")
def mark_as_read(id: int, db: Session = Depends(get_db)):
    """Mark a single notification as read"""
    notif = db.query(Notification).filter(Notification.id == id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notif.is_read = True
    db.commit()
    return {"status": "success"}

@router.put("/read-all")
def mark_all_read(db: Session = Depends(get_db)):
    """Mark all unread notifications as read"""
    db.query(Notification).filter(Notification.is_read == False).update({"is_read": True})
    db.commit()
    return {"status": "success"}

@router.delete("/clear-all")
def clear_all_notifications(db: Session = Depends(get_db)):
     """Delete all notifications (Optional utility)"""
     db.query(Notification).delete()
     db.commit()
     return {"status": "cleared"}
