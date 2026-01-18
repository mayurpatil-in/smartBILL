from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date

from app.database.session import get_db
from app.models.holiday import Holiday
from app.schemas.holiday import HolidayCreate, HolidayResponse
from app.core.dependencies import get_company_id

router = APIRouter(prefix="/holidays", tags=["Holidays"])

@router.get("/", response_model=List[HolidayResponse])
def get_holidays(
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    return db.query(Holiday).filter(
        Holiday.company_id == company_id
    ).order_by(Holiday.date.asc()).all()

@router.post("/", response_model=HolidayResponse)
def create_holiday(
    holiday: HolidayCreate,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    exists = db.query(Holiday).filter(
        Holiday.company_id == company_id,
        Holiday.date == holiday.date
    ).first()
    
    if exists:
        raise HTTPException(status_code=400, detail="Holiday already exists on this date")
        
    new_holiday = Holiday(
        company_id=company_id,
        name=holiday.name,
        date=holiday.date
    )
    db.add(new_holiday)
    db.commit()
    db.refresh(new_holiday)
    return new_holiday

@router.delete("/{holiday_id}")
def delete_holiday(
    holiday_id: int,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    holiday = db.query(Holiday).filter(
        Holiday.id == holiday_id,
        Holiday.company_id == company_id
    ).first()
    
    if not holiday:
        raise HTTPException(status_code=404, detail="Holiday not found")
        
    db.delete(holiday)
    db.commit()
    return {"message": "Holiday deleted"}
