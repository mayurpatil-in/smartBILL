from sqlalchemy import Column, Integer, Date, String, ForeignKey, Boolean, Text, DateTime, Enum, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import date
import enum

from app.database.base import Base
from app.models.company import Company
from app.models.financial_year import FinancialYear
from app.models.party import Party


class PartyChallanStatus(str, enum.Enum):
    OPEN = "open"
    PARTIAL = "partial"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class PartyChallan(Base):
    __tablename__ = "party_challan"

    id = Column(Integer, primary_key=True, index=True)

    company_id = Column(Integer, ForeignKey("company.id"), nullable=False)
    financial_year_id = Column(Integer, ForeignKey("financial_year.id"), nullable=False)
    party_id = Column(Integer, ForeignKey("party.id"), nullable=False)

    challan_number = Column(String(50), nullable=False, index=True)
    challan_date = Column(Date, default=date.today)
    working_days = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String(20), default="open")  # open, partial, completed, cancelled
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    company = relationship("Company")
    financial_year = relationship("FinancialYear")
    party = relationship("Party")
    items = relationship("PartyChallanItem", back_populates="party_challan", cascade="all, delete-orphan")
    delivery_challans = relationship("DeliveryChallan", back_populates="party_challan")

    __table_args__ = (
        UniqueConstraint('company_id', 'financial_year_id', 'party_id', 'challan_number', name='uix_pc_company_fy_party_challan_number'),
    )
