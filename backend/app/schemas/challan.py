from pydantic import BaseModel
from typing import List


class ChallanItemCreate(BaseModel):
    item_id: int
    quantity: float


class ChallanCreate(BaseModel):
    party_id: int
    items: List[ChallanItemCreate]
