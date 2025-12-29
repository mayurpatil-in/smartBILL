from pydantic import BaseModel
from typing import List, Optional
from datetime import date


# Challan Item Schemas
class ChallanItemCreate(BaseModel):
    item_id: int
    quantity: float


class ChallanItemResponse(BaseModel):
    id: int
    item_id: int
    quantity: float
    item: Optional[dict] = None  # Will include item details

    class Config:
        from_attributes = True


# Challan Schemas
class ChallanCreate(BaseModel):
    party_id: int
    challan_date: Optional[date] = None
    notes: Optional[str] = None
    status: Optional[str] = "draft"
    items: List[ChallanItemCreate]


class ChallanUpdate(BaseModel):
    party_id: Optional[int] = None
    challan_date: Optional[date] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None
    items: Optional[List[ChallanItemCreate]] = None


class ChallanResponse(BaseModel):
    id: int
    challan_number: str
    challan_date: date
    party_id: int
    company_id: int
    financial_year_id: int
    notes: Optional[str] = None
    status: str
    is_active: bool
    party: Optional[dict] = None  # Will include party details
    items: List[ChallanItemResponse] = []

    class Config:
        from_attributes = True
