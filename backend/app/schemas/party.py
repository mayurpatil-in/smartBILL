from pydantic import BaseModel
from typing import Optional


class PartyCreate(BaseModel):
    name: str
    gst_number: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    opening_balance: float = 0


class PartyResponse(PartyCreate):
    id: int

    class Config:
        from_attributes = True
