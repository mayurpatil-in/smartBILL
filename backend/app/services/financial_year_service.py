from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.financial_year import FinancialYear


# ============================================================
# CREATE FINANCIAL YEAR
# ============================================================
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

    return _fy_to_dict(fy)


# ============================================================
# GET ACTIVE FINANCIAL YEAR
# ============================================================
def get_active_financial_year(
    db: Session,
    company_id: int
):
    fy = (
        db.query(FinancialYear)
        .filter(
            FinancialYear.company_id == company_id,
            FinancialYear.is_active == True
        )
        .first()
    )

    if not fy:
        raise HTTPException(404, "No active financial year found")

    return _fy_to_dict(fy)


# ============================================================
# LIST ALL FINANCIAL YEARS
# ============================================================
def get_all_financial_years(
    db: Session,
    company_id: int
):
    fys = (
        db.query(FinancialYear)
        .filter(FinancialYear.company_id == company_id)
        .order_by(FinancialYear.start_date.desc())
        .all()
    )

    return [
        {
            "id": fy.id,
            "start_date": fy.start_date,
            "end_date": fy.end_date,
            "is_active": fy.is_active,
            "is_locked": fy.is_locked,
        }
        for fy in fys
    ]


# ============================================================
# ACTIVATE (SWITCH) FINANCIAL YEAR
# ============================================================
def activate_financial_year(
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
        raise HTTPException(400, "Financial year is locked")

    # deactivate current active FY
    db.query(FinancialYear).filter(
        FinancialYear.company_id == company_id,
        FinancialYear.is_active == True
    ).update({"is_active": False})

    fy.is_active = True
    db.commit()
    db.refresh(fy)

    return _fy_to_dict(fy)


# ============================================================
# LOCK FINANCIAL YEAR (PERMANENT CLOSE)
# ============================================================
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
    db.refresh(fy)

    return _fy_to_dict(fy)


# ============================================================
# DELETE FINANCIAL YEAR (SAFE)
# ============================================================
def delete_financial_year(
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

    if fy.is_active:
        raise HTTPException(400, "Cannot delete active financial year")

    if fy.is_locked:
        raise HTTPException(400, "Cannot delete locked financial year")

    db.delete(fy)
    db.commit()

    return {"message": "Financial year deleted"}


# ============================================================
# INTERNAL HELPER (SINGLE SOURCE OF TRUTH)
# ============================================================
def _fy_to_dict(fy: FinancialYear):
    return {
        "id": fy.id,
        "start_date": fy.start_date,
        "end_date": fy.end_date,
        "is_active": fy.is_active,
        "is_locked": fy.is_locked,
        "company_name": fy.company.name,
    }
