from sqlalchemy import Column, Integer, Numeric, Date, Boolean, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from datetime import date

from app.database.base import Base
from app.models.company import Company
from app.models.financial_year import FinancialYear
from app.models.party import Party
from app.models.delivery_challan import DeliveryChallan


class Invoice(Base):
    __tablename__ = "invoice"

    id = Column(Integer, primary_key=True, index=True)

    company_id = Column(Integer, ForeignKey("company.id"), nullable=False)
    financial_year_id = Column(Integer, ForeignKey("financial_year.id"), nullable=False)
    party_id = Column(Integer, ForeignKey("party.id"), nullable=False)
    challan_id = Column(Integer, ForeignKey("delivery_challan.id"), nullable=True)

    invoice_number = Column(String(50), nullable=False, unique=True, index=True)
    
    invoice_date = Column(Date, default=date.today)
    due_date = Column(Date, nullable=True)

    subtotal = Column(Numeric(12, 2))
    gst_amount = Column(Numeric(12, 2))
    grand_total = Column(Numeric(12, 2))

    status = Column(String(20), default="DRAFT")
    is_locked = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)

    company = relationship(Company)
    financial_year = relationship(FinancialYear)
    party = relationship(Party)
    challan = relationship(DeliveryChallan)
    items = relationship("InvoiceItem", back_populates="invoice")
