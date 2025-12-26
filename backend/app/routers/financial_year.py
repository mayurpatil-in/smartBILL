from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.financial_year import (
    FinancialYearCreate,
    FinancialYearResponse,
    FinancialYearListResponse
)
from app.core.dependencies import get_company_id
from app.services.financial_year_service import (
    create_financial_year,
    get_active_financial_year,
    lock_financial_year,
    get_all_financial_years,
    activate_financial_year,
    delete_financial_year
)

router = APIRouter(
    prefix="/financial-year",
    tags=["Financial Year"]
)


# ============================================================
# CREATE FINANCIAL YEAR
# ============================================================
@router.post("/", response_model=FinancialYearResponse)
def create_financial_year_api(
    data: FinancialYearCreate,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    # service already returns correct response shape
    return create_financial_year(
        db=db,
        company_id=company_id,
        start_date=data.start_date,
        end_date=data.end_date
    )


# ============================================================
# GET ACTIVE FINANCIAL YEAR
# ============================================================
@router.get("/active", response_model=FinancialYearResponse)
def get_active_financial_year_api(
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    return get_active_financial_year(db, company_id)


# ============================================================
# LIST ALL FINANCIAL YEARS
# ============================================================
@router.get("/", response_model=list[FinancialYearListResponse])
def list_financial_years(
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    return get_all_financial_years(db, company_id)


# ============================================================
# ACTIVATE FINANCIAL YEAR
# ============================================================
@router.post("/{fy_id}/activate")
def activate_financial_year_api(
    fy_id: int,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    return activate_financial_year(db, company_id, fy_id)


# ============================================================
# LOCK FINANCIAL YEAR
# ============================================================
@router.post("/{fy_id}/lock")
def lock_financial_year_api(
    fy_id: int,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    return lock_financial_year(db, company_id, fy_id)


# ============================================================
# DELETE FINANCIAL YEAR
# ============================================================
@router.delete("/{fy_id}")
def delete_financial_year_api(
    fy_id: int,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    return delete_financial_year(db, company_id, fy_id)
