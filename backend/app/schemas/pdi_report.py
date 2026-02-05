from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import date, datetime

class PDIReportBase(BaseModel):
    inspection_date: Optional[date] = None
    inspector_name: Optional[str] = None
    checklist: Optional[Dict[str, str]] = None
    remarks: Optional[str] = None
    status: Optional[str] = "Pending"

class PDIReportCreate(PDIReportBase):
    challan_id: int

class PDIReportUpdate(PDIReportBase):
    pass

class PDIReportResponse(PDIReportBase):
    id: int
    challan_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
