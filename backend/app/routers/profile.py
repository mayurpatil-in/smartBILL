from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
import shutil
import os
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.auth.auth_router import oauth2_scheme
from app.core.security import get_password_hash, verify_password
from app.models.user import User
from app.models.company import Company
from app.schemas.profile import ProfileUpdate, CompanyProfileUpdate
from jose import jwt
from app.core.config import settings

router = APIRouter(prefix="/profile", tags=["Profile"])

# Helper to get current user from token
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@router.get("/")
def get_profile(user: User = Depends(get_current_user)):
    return {
        "user": {
            "name": user.name,
            "email": user.email,
            "role": user.role,
        },
        "company": user.company  # SQLAlchemy model will be serialized automatically if simple
    }


@router.patch("/user")
def update_user_profile(
    data: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Update Name
    if data.name:
        user.name = data.name

    # Update Email (Check uniqueness)
    if data.email and data.email != user.email:
        existing = db.query(User).filter(User.email == data.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        user.email = data.email

    # Update Password
    if data.new_password:
        if not data.current_password:
            raise HTTPException(status_code=400, detail="Current password required to set new password")
        if not verify_password(data.current_password, user.password_hash):
            raise HTTPException(status_code=400, detail="Incorrect current password")
        
        user.password_hash = get_password_hash(data.new_password)

    db.commit()
    db.refresh(user)
    return {"message": "Profile updated successfully", "user": user}


@router.patch("/company")
def update_company_profile(
    data: CompanyProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not user.company_id:
        raise HTTPException(status_code=400, detail="User does not belong to a company")
    
    # Check permissions? Assuming any authenticated user can update or just Admin?
    # Usually strictly Company Admin.
    if user.role.value != "COMPANY_ADMIN":
        raise HTTPException(status_code=403, detail="Only Company Admins can update company details")

    company = user.company
    
    if data.name: company.name = data.name
    if data.gst_number: company.gst_number = data.gst_number
    if data.address: company.address = data.address
    if data.phone: company.phone = data.phone
    if data.email: company.email = data.email

    db.commit()
    db.refresh(company)
    return {"message": "Company details updated", "company": company}


@router.post("/company/logo")
def upload_company_logo(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not user.company_id:
        raise HTTPException(status_code=400, detail="User does not belong to a company")
    
    if user.role.value != "COMPANY_ADMIN":
        raise HTTPException(status_code=403, detail="Only Company Admins can upload logo")

    # VALIDATION: Allowed types
    ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
    ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}

    # 1. Validate Extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Invalid file type. Only PNG, JPG, and WEBP allowed.")

    # 2. Validate MIME Type (Header check)
    if file.content_type not in ALLOWED_MIME_TYPES:
         raise HTTPException(status_code=400, detail="Invalid content type.")

    # Create directory if not exists
    upload_dir = "uploads/logos"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate filename (use company ID + timestamp to avoid caching)
    import time
    timestamp = int(time.time())
    filename = f"company_{user.company_id}_logo_{timestamp}{ext}"
    file_path = os.path.join(upload_dir, filename)
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Update company record
    # Store relative path for frontend to use with base URL
    # e.g. /uploads/logos/company_1_logo.png
    logo_url = f"/{upload_dir}/{filename}".replace("\\", "/") # Ensure forward slashes
    
    company = user.company
    company.logo = logo_url
    db.commit()
    db.refresh(company)
    
    return {"message": "Logo uploaded successfully", "logo_url": logo_url}
