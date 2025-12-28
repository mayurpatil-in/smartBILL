from pydantic import BaseModel, EmailStr
from datetime import date


class CompanyCreate(BaseModel):
    name: str
    gst_number: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    subscription_start: date
    subscription_end: date


class CompanyResponse(BaseModel):
    id: int
    name: str
    email:  EmailStr | None = None
    phone: str | None = None
    gst_number: str | None = None
    is_active: bool
    subscription_start: date
    subscription_end: date

    class Config:
        from_attributes = True


class CreateCompanyAdmin(BaseModel):
    name: str
    email: EmailStr
    password: str
