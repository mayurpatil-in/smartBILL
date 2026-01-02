from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date


class InvoiceItemCreate(BaseModel):
    item_id: int
    grn_no: Optional[str] = None
    delivery_challan_item_id: Optional[int] = None
    quantity: float
    rate: float


class PartyResponse(BaseModel):
    id: int
    name: str
    
    class Config:
        from_attributes = True

class ItemSimpleResponse(BaseModel):
    id: int
    name: str
    
    class Config:
        from_attributes = True


class DeliveryChallanSimpleResponse(BaseModel):
    id: int
    challan_number: str

    class Config:
        from_attributes = True

class DeliveryChallanItemSimpleResponse(BaseModel):
    id: int
    challan: Optional[DeliveryChallanSimpleResponse] = None
    quantity: float
    ok_qty: float
    cr_qty: float
    mr_qty: float

    class Config:
        from_attributes = True

class InvoiceItemResponse(BaseModel):
    item_id: int
    grn_no: Optional[str] = None
    delivery_challan_item_id: Optional[int] = None
    delivery_challan_item: Optional[DeliveryChallanItemSimpleResponse] = None
    quantity: float
    rate: float
    amount: float
    item: Optional[ItemSimpleResponse] = None
    
    class Config:
        from_attributes = True


class InvoiceCreate(BaseModel):
    party_id: int
    invoice_date: date
    due_date: Optional[date] = None
    notes: Optional[str] = None
    items: List[InvoiceItemCreate]


class InvoiceResponse(BaseModel):
    id: int
    invoice_number: str
    invoice_date: date
    due_date: Optional[date] = None
    status: str
    notes: Optional[str] = None
    
    party_id: int
    party: Optional[PartyResponse] = None
    
    subtotal: float
    gst_amount: float
    grand_total: float
    
    items: List[InvoiceItemResponse]

    class Config:
        from_attributes = True
