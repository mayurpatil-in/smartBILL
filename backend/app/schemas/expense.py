from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import date as dt_date # Alias to avoid collision
from decimal import Decimal

# Shared ID base
class ExpenseBase(BaseModel):
    date: Optional[dt_date] = None
    category: str
    description: Optional[str] = None
    amount: Decimal
    payment_method: str = "Cash"
    
    # Optional Vendor
    party_id: Optional[int] = None
    
    # Payment Ref
    reference_no: Optional[str] = None
    
    # Cheque Details
    cheque_no: Optional[str] = None
    cheque_date: Optional[dt_date] = None
    bank_name: Optional[str] = None
    payee_name: Optional[str] = None
    
    # Recurring
    is_recurring: bool = False
    recurring_frequency: Optional[str] = None # Monthly, Weekly, Yearly
    next_due_date: Optional[dt_date] = None
    status: Optional[str] = "PAID"

class ExpenseCreate(ExpenseBase):
    date: dt_date # Required on create

    @validator('amount')
    def amount_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError('Amount must be positive')
        return v
        
    @validator('cheque_no', 'bank_name', always=True)
    def validate_cheque_details(cls, v, values):
        # If payment method is Cheque, these fields might be encouraged, but we won't strictly enforce to avoid UX friction
        # strict validation can be added here if requested
        return v

    @validator('cheque_date', 'next_due_date', pre=True)
    def parse_empty_dates(cls, v):
        if not v: # Handles empty strings, None, false
            return None
        return v

class ExpenseUpdate(ExpenseBase):
    pass

class ExpenseResponse(ExpenseBase):
    id: int
    date: dt_date
    company_id: int
    financial_year_id: int
    party_name: Optional[str] = None # Helper for UI
    
    class Config:
        from_attributes = True

# Stats Schema
class ExpenseStats(BaseModel):
    total_amount: Decimal
    this_month_amount: Decimal
    count: int
