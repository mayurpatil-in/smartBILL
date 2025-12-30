from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Any
from datetime import date


# Challan Item Schemas
class ChallanItemCreate(BaseModel):
    party_challan_item_id: int  # Links to specific party challan item
    ok_qty: float
    cr_qty: float = 0
    mr_qty: float = 0
    quantity: float  # Total (ok_qty + cr_qty + mr_qty)


class ChallanItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    party_challan_item_id: int
    ok_qty: float
    cr_qty: float
    mr_qty: float
    quantity: float
    item: Optional[Any] = None
    process: Optional[Any] = None
    party_challan_item: Optional[Any] = None


# Challan Schemas
class ChallanCreate(BaseModel):
    party_id: int
    challan_date: Optional[date] = None
    vehicle_number: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = "draft"
    items: List[ChallanItemCreate]


class ChallanUpdate(BaseModel):
    party_id: Optional[int] = None
    challan_date: Optional[date] = None
    vehicle_number: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None
    items: Optional[List[ChallanItemCreate]] = None


class ChallanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    challan_number: str
    challan_date: date
    party_id: int
    company_id: int
    financial_year_id: int
    vehicle_number: Optional[str] = None
    notes: Optional[str] = None
    status: str
    is_active: bool
    party: Optional[Any] = None
    items: List[ChallanItemResponse] = []
