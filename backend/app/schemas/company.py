from datetime import date
from pydantic import BaseModel, EmailStr
from typing import Optional


class CompanyBase(BaseModel):
    name: str
    gst_number: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None


class CompanyCreate(CompanyBase):
    subscription_start: date
    subscription_end: date
    is_active: bool = True


class CompanyResponse(CompanyBase):
    id: int
    subscription_start: date
    subscription_end: date
    is_active: bool

    class Config:
        from_attributes = True
