from pydantic import BaseModel
from typing import Optional, List
from datetime import date
from decimal import Decimal

class PaymentBase(BaseModel):
    party_id: int
    payment_date: date
    amount: Decimal
    payment_type: str = "RECEIVED" # RECEIVED or PAID
    payment_mode: str = "CASH" # CASH, BANK_TRANSFER, CHEQUE, UP, OTHER
    reference_number: Optional[str] = None
    notes: Optional[str] = None

class AllocationCreate(BaseModel):
    invoice_id: int
    amount: Decimal

class PaymentCreate(PaymentBase):
    allocations: List[AllocationCreate] = []

class PaymentUpdate(PaymentBase):
    party_id: Optional[int] = None
    payment_date: Optional[date] = None
    amount: Optional[Decimal] = None
    payment_type: Optional[str] = None
    payment_mode: Optional[str] = None

class PartySummary(BaseModel):
    id: int
    name: str

class InvoiceSummary(BaseModel):
    id: int
    invoice_number: str
    invoice_date: date
    grand_total: Decimal
    paid_amount: Optional[Decimal] = 0

class AllocationResponse(BaseModel):
    invoice_id: int
    amount: Decimal
    invoice: Optional[InvoiceSummary] = None

    class Config:
        from_attributes = True

class PaymentResponse(PaymentBase):
    id: int
    company_id: int
    financial_year_id: int
    party: Optional[PartySummary] = None 
    allocations: List[AllocationResponse] = []

    class Config:
        from_attributes = True
