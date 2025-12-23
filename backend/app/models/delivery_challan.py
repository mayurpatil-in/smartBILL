from sqlalchemy import Column, Integer, Date, String, ForeignKey
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

    challan_date = Column(Date, default=date.today)
    status = Column(String(20), default="OPEN")  # OPEN / BILLED

    company = relationship(Company)
    financial_year = relationship(FinancialYear)
    party = relationship(Party)
    items = relationship("DeliveryChallanItem", back_populates="challan")
