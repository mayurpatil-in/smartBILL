"""Pydantic schemas for E-Way Bill"""

from pydantic import BaseModel, Field, validator
from typing import Optional, Literal
from datetime import date


class EWayBillCreate(BaseModel):
    """Schema for saving transport details (used by BOTH online & offline flows)"""
    transport_mode: str = Field(..., description="Transport mode: Road/Rail/Air/Ship")
    vehicle_number: str = Field(..., min_length=1, max_length=20, description="Vehicle registration number")
    transport_distance: int = Field(..., gt=0, description="Transport distance in kilometers")
    transporter_id: Optional[str] = Field(None, max_length=15, description="Transporter GSTIN")
    vehicle_type: Optional[str] = Field("Regular", description="Vehicle type: Regular/ODC")
    transporter_doc_no: Optional[str] = Field(None, max_length=50, description="Transporter document number")
    transporter_doc_date: Optional[date] = Field(None, description="Transporter document date")
    
    @validator('transport_mode')
    def validate_transport_mode(cls, v):
        valid_modes = ['Road', 'Rail', 'Air', 'Ship']
        if v not in valid_modes:
            raise ValueError(f'Transport mode must be one of: {", ".join(valid_modes)}')
        return v
    
    @validator('vehicle_type')
    def validate_vehicle_type(cls, v):
        if v and v not in ['Regular', 'ODC']:
            raise ValueError('Vehicle type must be either Regular or ODC')
        return v
    
    @validator('vehicle_number')
    def validate_vehicle_number(cls, v):
        return v.strip().upper()


class EWayBillManualCreate(EWayBillCreate):
    """
    Schema for OFFLINE/MANUAL E-Way Bill entry.
    Client fills EWB on NIC portal manually, then enters the number here.
    Extends EWayBillCreate with the required EWB number field.
    """
    eway_bill_number: str = Field(
        ...,
        min_length=12,
        max_length=12,
        description="12-digit E-Way Bill number from NIC portal"
    )
    eway_bill_date: date = Field(
        ...,
        description="Date of E-Way Bill generation on NIC portal"
    )

    @validator('eway_bill_number')
    def validate_ewb_number(cls, v):
        v = v.strip()
        if not v.isdigit():
            raise ValueError('E-Way Bill number must be 12 digits (numbers only)')
        if len(v) != 12:
            raise ValueError('E-Way Bill number must be exactly 12 digits')
        return v


class EWayBillResponse(BaseModel):
    """Schema for e-way bill response (used by both online & offline)"""
    eway_bill_number: Optional[str]
    eway_bill_date: Optional[date]
    transport_mode: Optional[str]
    vehicle_number: Optional[str]
    transporter_id: Optional[str]
    transport_distance: Optional[int]
    vehicle_type: Optional[str]
    transporter_doc_no: Optional[str]
    transporter_doc_date: Optional[date]
    validity_days: Optional[int]
    validity_description: Optional[str]
    # Tells frontend how the EWB was created
    eway_bill_mode: Optional[Literal["online", "manual"]] = None
    message: Optional[str] = None
    
    class Config:
        from_attributes = True


class EWayBillPreviewRequest(BaseModel):
    """Schema for e-way bill preview request"""
    transport_mode: str
    vehicle_number: str
    transport_distance: int
    transporter_id: Optional[str] = None
    vehicle_type: Optional[str] = "Regular"
    transporter_doc_no: Optional[str] = None
    transporter_doc_date: Optional[date] = None


class EWayCancelRequest(BaseModel):
    """Schema for cancelling an E-Way Bill"""
    cancel_reason: int = Field(
        2,
        ge=1, le=4,
        description="1=Duplicate, 2=Order Cancelled, 3=Data Entry Mistake, 4=Others"
    )
    cancel_remark: Optional[str] = Field("", max_length=100)
