from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.models.company import Company
from app.schemas.company import CompanyResponse
from app.core.dependencies import get_company_id

router = APIRouter(prefix="/company", tags=["Company Settings"])

@router.get("/settings", response_model=CompanyResponse)
def get_company_settings(
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company

@router.put("/settings/off-days")
def update_off_days(
    off_days: List[int],
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Validate days (0-6)
    for day in off_days:
        if day < 0 or day > 6:
            raise HTTPException(status_code=400, detail="Invalid day index. Must be 0 (Mon) to 6 (Sun).")
            
    company.off_days = off_days
    db.commit()
    db.refresh(company)
    return {"message": "Off days updated", "off_days": company.off_days}
