from pydantic import BaseModel
from typing import Optional


class ItemCreate(BaseModel):
    name: str
    hsn_code: Optional[str] = None
    po_number: Optional[str] = None
    casting_weight: float = 0
    scrap_weight: float = 0
    rate: float
    party_id: Optional[int] = None
    process_id: Optional[int] = None
    barcode: Optional[str] = None
    is_active: bool = True



from app.schemas.process import ProcessResponse

class ItemResponse(ItemCreate):
    id: int
    financial_year_id: Optional[int] = None
    company_id: int
    process: Optional[ProcessResponse] = None

    class Config:
        from_attributes = True
