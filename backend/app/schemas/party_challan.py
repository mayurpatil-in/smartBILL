from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Any
from datetime import date


# Party Challan Item Schemas
class PartyChallanItemCreate(BaseModel):
    item_id: int
    process_id: Optional[int] = None
    quantity_ordered: float
    rate: Optional[float] = None


class PartyChallanItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    item_id: int
    process_id: Optional[int] = None
    quantity_ordered: float
    quantity_delivered: float
    rate: Optional[float] = None
    item: Optional[Any] = None
    process: Optional[Any] = None


# Party Challan Schemas
class PartyChallanCreate(BaseModel):
    challan_number: Optional[str] = None  # Optional manual entry
    party_id: int
    challan_date: Optional[date] = None
    working_days: Optional[int] = None
    notes: Optional[str] = None
    items: List[PartyChallanItemCreate]


class PartyChallanUpdate(BaseModel):
    party_id: Optional[int] = None
    challan_date: Optional[date] = None
    working_days: Optional[int] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None
    items: Optional[List[PartyChallanItemCreate]] = None


class PartyChallanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    challan_number: str
    challan_date: date
    party_id: int
    company_id: int
    financial_year_id: int
    working_days: Optional[int] = None
    notes: Optional[str] = None
    status: str
    is_active: bool
    party: Optional[Any] = None
    items: List[PartyChallanItemResponse] = []


class DeliveryProgress(BaseModel):
    """Progress of deliveries for a party challan"""
    party_challan_id: int
    challan_number: str
    total_items: int
    items_progress: List[dict]  # List of {item_name, ordered, delivered, remaining}
    overall_percentage: float

