from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.financial_year import FinancialYear
from app.schemas.financial_year import FinancialYearCreate, FinancialYearResponse
from app.core.dependencies import get_company_id

router = APIRouter(
    prefix="/financial-year",
    tags=["Financial Year"]
)


@router.post("/", response_model=FinancialYearResponse)
def create_financial_year(
    data: FinancialYearCreate,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    # Deactivate existing FY
    db.query(FinancialYear).filter(
        FinancialYear.company_id == company_id,
        FinancialYear.is_active == True
    ).update({"is_active": False})

    fy = FinancialYear(
        company_id=company_id,
        start_date=data.start_date,
        end_date=data.end_date,
        is_active=True
    )

    db.add(fy)
    db.commit()
    db.refresh(fy)

    return fy


@router.get("/active", response_model=FinancialYearResponse)
def get_active_financial_year(
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    fy = db.query(FinancialYear).filter(
        FinancialYear.company_id == company_id,
        FinancialYear.is_active == True
    ).first()

    if not fy:
        raise HTTPException(404, "No active financial year found")

    return fy


@router.post("/{fy_id}/lock")
def lock_financial_year(
    fy_id: int,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    fy = db.query(FinancialYear).filter(
        FinancialYear.id == fy_id,
        FinancialYear.company_id == company_id
    ).first()

    if not fy:
        raise HTTPException(404, "Financial year not found")

    fy.is_locked = True
    fy.is_active = False

    db.commit()

    return {"message": "Financial year locked"}
