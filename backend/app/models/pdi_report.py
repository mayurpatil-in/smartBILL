from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime, Date, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import date

from app.database.base import Base

class PDIReport(Base):
    __tablename__ = "pdi_report"

    id = Column(Integer, primary_key=True, index=True)
    challan_id = Column(Integer, ForeignKey("delivery_challan.id"), nullable=False, unique=True)
    
    inspection_date = Column(Date, default=date.today)
    inspector_name = Column(String(100), nullable=True)
    
    # Store checklist as JSON: {"Physical Condition": "Pass", "Accessories": "Fail", ...}
    checklist = Column(JSON, nullable=True)
    
    remarks = Column(Text, nullable=True)
    status = Column(String(20), default="Pending") # Pass, Fail, Pending
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    challan = relationship("DeliveryChallan", backref="pdi_report")
