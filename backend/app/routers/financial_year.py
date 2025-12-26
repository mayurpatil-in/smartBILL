from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.financial_year import FinancialYearCreate, FinancialYearResponse
from app.core.dependencies import get_company_id
from app.services.financial_year_service import (
    create_financial_year,
    get_active_financial_year,
    lock_financial_year
)

router = APIRouter(
    prefix="/financial-year",
    tags=["Financial Year"]
)


@router.post("/", response_model=FinancialYearResponse)
def create_financial_year_api(
    data: FinancialYearCreate,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    return create_financial_year(
        db=db,
        company_id=company_id,
        start_date=data.start_date,
        end_date=data.end_date
    )


@router.get("/active", response_model=FinancialYearResponse)
def get_active_financial_year_api(
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    return get_active_financial_year(
        db=db,
        company_id=company_id
    )


@router.post("/{fy_id}/lock")
def lock_financial_year_api(
    fy_id: int,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    lock_financial_year(
        db=db,
        company_id=company_id,
        fy_id=fy_id
    )
    return {"message": "Financial year locked successfully"}
