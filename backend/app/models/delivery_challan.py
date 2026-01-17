from sqlalchemy import Column, Integer, Date, String, ForeignKey, Boolean, Text, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import date

from app.database.base import Base
from app.models.company import Company
from app.models.financial_year import FinancialYear
from app.models.party import Party


class DeliveryChallan(Base):
    __tablename__ = "delivery_challan"

    id = Column(Integer, primary_key=True, index=True)

    company_id = Column(Integer, ForeignKey("company.id"), nullable=False)
    financial_year_id = Column(Integer, ForeignKey("financial_year.id"), nullable=False)
    party_id = Column(Integer, ForeignKey("party.id"), nullable=False)
    party_challan_id = Column(Integer, ForeignKey("party_challan.id"), nullable=True)  # Optional link

    challan_number = Column(String(50), nullable=False, index=True)
    challan_date = Column(Date, default=date.today)
    vehicle_number = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String(20), default="draft")  # draft, sent, delivered
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    company = relationship("Company")
    financial_year = relationship("FinancialYear")
    party = relationship("Party")
    party_challan = relationship("PartyChallan", foreign_keys=[party_challan_id], back_populates="delivery_challans")
    items = relationship("DeliveryChallanItem", back_populates="challan")

    __table_args__ = (
        UniqueConstraint('company_id', 'financial_year_id', 'party_id', 'challan_number', name='uix_delivery_company_fy_party_challan_number'),
    )
