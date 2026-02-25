from datetime import date
from pydantic import BaseModel, EmailStr
from typing import Optional, List


class CompanyBase(BaseModel):
    name: str
    gst_number: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    logo: Optional[str] = None
    off_days: Optional[List[int]] = []


class CompanyCreate(CompanyBase):
    subscription_start: date
    subscription_end: date
    is_active: bool = True


from app.schemas.super_admin import SubscriptionPlanResponse

class CompanyResponse(CompanyBase):
    id: int
    subscription_start: date
    subscription_end: date
    is_active: bool
    plan: Optional[SubscriptionPlanResponse] = None

    class Config:
        from_attributes = True
