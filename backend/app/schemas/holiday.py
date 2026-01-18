from pydantic import BaseModel
from datetime import date
from typing import Optional

class HolidayBase(BaseModel):
    name: str
    date: date

class HolidayCreate(HolidayBase):
    pass

class HolidayResponse(HolidayBase):
    id: int
    company_id: int

    class Config:
        from_attributes = True
