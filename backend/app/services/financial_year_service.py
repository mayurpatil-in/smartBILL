from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.financial_year import FinancialYear


def create_financial_year(
    db: Session,
    company_id: int,
    start_date,
    end_date
):
    # Deactivate previous active FY
    db.query(FinancialYear).filter(
        FinancialYear.company_id == company_id,
        FinancialYear.is_active == True
    ).update(
        {"is_active": False},
        synchronize_session=False
    )

    fy = FinancialYear(
        company_id=company_id,
        start_date=start_date,
        end_date=end_date,
        is_active=True,
        is_locked=False
    )

    db.add(fy)
    db.commit()
    db.refresh(fy)

    return fy


def get_active_financial_year(
    db: Session,
    company_id: int
):
    fy = db.query(FinancialYear).filter(
        FinancialYear.company_id == company_id,
        FinancialYear.is_active == True
    ).first()

    if not fy:
        raise HTTPException(404, "No active financial year found")

    return fy


def lock_financial_year(
    db: Session,
    company_id: int,
    fy_id: int
):
    fy = db.query(FinancialYear).filter(
        FinancialYear.id == fy_id,
        FinancialYear.company_id == company_id
    ).first()

    if not fy:
        raise HTTPException(404, "Financial year not found")

    if fy.is_locked:
        raise HTTPException(400, "Financial year already locked")

    fy.is_locked = True
    fy.is_active = False

    db.commit()

    return fy
