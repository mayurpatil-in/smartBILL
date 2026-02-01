from pydantic import BaseModel
from typing import Optional


class PartyCreate(BaseModel):
    name: str
    gst_number: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    opening_balance: float = 0
    is_active: bool = True
    
    # Optional fields for Client Portal creation
    portal_username: Optional[str] = None
    portal_password: Optional[str] = None


class ClientLoginResponse(BaseModel):
    id: int
    username: str
    is_active: bool
    
    class Config:
        from_attributes = True


class PartyResponse(PartyCreate):
    id: int
    current_balance: float = 0
    total_received: float = 0
    client_login: Optional[ClientLoginResponse] = None

    class Config:
        from_attributes = True

