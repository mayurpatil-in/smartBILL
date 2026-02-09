"""Pydantic schemas for E-Way Bill"""

from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import date


class EWayBillCreate(BaseModel):
    """Schema for creating/updating e-way bill details"""
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
        # Remove spaces and convert to uppercase
        return v.strip().upper()


class EWayBillResponse(BaseModel):
    """Schema for e-way bill response"""
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
