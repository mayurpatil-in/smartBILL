from pydantic import BaseModel, EmailStr

class ProfileUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    current_password: str | None = None
    new_password: str | None = None

class CompanyProfileUpdate(BaseModel):
    name: str | None = None
    gst_number: str | None = None
    address: str | None = None
    phone: str | None = None
    email: str | None = None
