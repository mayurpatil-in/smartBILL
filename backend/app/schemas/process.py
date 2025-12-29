from pydantic import BaseModel
from typing import Optional


class ProcessCreate(BaseModel):
    name: str
    is_active: bool = True


class ProcessResponse(ProcessCreate):
    id: int
    company_id: int

    class Config:
        from_attributes = True
