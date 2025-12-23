from sqlalchemy import Column, Integer, String, Numeric, ForeignKey
from sqlalchemy.orm import relationship

from app.database.base import Base
from app.models.company import Company
from app.models.financial_year import FinancialYear
from app.models.item import Item


class StockTransaction(Base):
    __tablename__ = "stock_transactions"

    id = Column(Integer, primary_key=True, index=True)

    company_id = Column(Integer, ForeignKey("company.id"), nullable=False)
    financial_year_id = Column(Integer, ForeignKey("financial_year.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)

    quantity = Column(Numeric(10, 2), nullable=False)
    transaction_type = Column(String(10))  # IN / OUT
    reference_type = Column(String(20))    # CHALLAN / INVOICE
    reference_id = Column(Integer)

    company = relationship(Company)
    financial_year = relationship(FinancialYear)
    item = relationship(Item)
