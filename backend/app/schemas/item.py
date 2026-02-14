from pydantic import BaseModel
from typing import Optional, List, Dict


class ItemCreate(BaseModel):
    name: str
    part_no: Optional[str] = None
    hsn_code: Optional[str] = None
    po_number: Optional[str] = None
    casting_weight: float = 0
    scrap_weight: float = 0
    rate: float
    party_id: Optional[int] = None
    process_id: Optional[int] = None
    barcode: Optional[str] = None
    is_active: bool = True
    # PDI configuration fields
    pdi_parameters: Optional[List[Dict[str, str]]] = None
    pdi_dimensions: Optional[List[Dict[str, str]]] = None
    pdi_equipment: Optional[List[str]] = None



from app.schemas.process import ProcessResponse

class ItemResponse(ItemCreate):
    id: int
    financial_year_id: Optional[int] = None
    company_id: int
    process: Optional[ProcessResponse] = None

    class Config:
        from_attributes = True
