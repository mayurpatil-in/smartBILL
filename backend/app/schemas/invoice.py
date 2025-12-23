from pydantic import BaseModel
from typing import List


class InvoiceItemResponse(BaseModel):
    item_id: int
    quantity: float
    rate: float
    amount: float


class InvoiceResponse(BaseModel):
    id: int
    subtotal: float
    gst_amount: float
    grand_total: float
    items: List[InvoiceItemResponse]

    class Config:
        from_attributes = True
