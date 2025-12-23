from sqlalchemy import Column, Integer, String, Numeric, ForeignKey
from sqlalchemy.orm import relationship

from app.database.base import Base
from app.models.company import Company
from app.models.financial_year import FinancialYear


class Party(Base):
    __tablename__ = "party"

    id = Column(Integer, primary_key=True, index=True)

    company_id = Column(
        Integer,
        ForeignKey("company.id", ondelete="CASCADE"),
        nullable=False
    )

    financial_year_id = Column(
        Integer,
        ForeignKey("financial_year.id", ondelete="CASCADE"),
        nullable=False
    )

    name = Column(String(255), nullable=False)
    gst_number = Column(String(20), nullable=True)
    address = Column(String, nullable=True)
    phone = Column(String(20), nullable=True)
    opening_balance = Column(Numeric(12, 2), default=0)

    company = relationship(Company)
    financial_year = relationship(FinancialYear)
