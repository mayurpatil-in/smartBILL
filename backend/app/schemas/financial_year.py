from datetime import date
from pydantic import BaseModel


class FinancialYearCreate(BaseModel):
    start_date: date
    end_date: date


class FinancialYearResponse(BaseModel):
    id: int
    start_date: date
    end_date: date
    is_active: bool
    is_locked: bool
    company_name: str

    class Config:
        from_attributes = True

# ✅ ADD THIS (MISSING SCHEMA)
class FinancialYearListResponse(BaseModel):
    id: int
    start_date: date
    end_date: date
    is_active: bool
    is_locked: bool

    class Config:
        from_attributes = True