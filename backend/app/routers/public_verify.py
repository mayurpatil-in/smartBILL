from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from jose import jwt, JWTError
from app.database.session import get_db
from app.models.user import User
from app.core.config import settings

router = APIRouter(prefix="/public/verify", tags=["Public Verification"])

@router.get("/employee/{user_id}")
def verify_employee(
    user_id: int, 
    token: Optional[str] = Query(None), 
    db: Session = Depends(get_db)
):
    # 🔐 Security Check
    if not token:
        raise HTTPException(status_code=403, detail="Missing secure verification token")
    
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") != "verification" or str(payload.get("sub")) != str(user_id):
            raise HTTPException(status_code=403, detail="Token mismatch")
    except JWTError:
        raise HTTPException(status_code=403, detail="Invalid or expired token")

    user = db.query(User).options(
        joinedload(User.employee_profile), 
        joinedload(User.company)
    ).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Return minimal safe data for verification
    return {
        "name": user.name,
        "designation": user.employee_profile.designation if user.employee_profile else "N/A",
        "photo_path": user.employee_profile.photo_path if user.employee_profile else None,
        "company_name": user.company.name if user.company else "Unknown Company",
        "company_logo": user.company.logo if user.company else None,
        "is_active": user.is_active,
        "joining_date": user.employee_profile.joining_date if user.employee_profile else None,
        "phone": user.employee_profile.phone if user.employee_profile else None,
        "id": user.id
    }
