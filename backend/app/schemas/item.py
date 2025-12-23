from pydantic import BaseModel
from typing import Optional


class ItemCreate(BaseModel):
    name: str
    hsn_code: Optional[str] = None
    unit: Optional[str] = None
    rate: float


class ItemResponse(ItemCreate):
    id: int

    class Config:
        from_attributes = True
