from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, Boolean
from sqlalchemy.orm import relationship

from app.database.base import Base
from app.models.company import Company
from app.models.party import Party
from app.models.financial_year import FinancialYear
from app.models.process import Process


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)

    company_id = Column(
        Integer,
        ForeignKey("company.id", ondelete="CASCADE"),
        nullable=False
    )
    financial_year_id = Column(
        Integer, 
        ForeignKey("financial_year.id", ondelete="CASCADE"), 
        nullable=True # Nullable for migration safety, logically should be False later
    )
    party_id = Column(
        Integer, 
        ForeignKey("party.id", ondelete="SET NULL"), 
        nullable=True
    )
    process_id = Column(
        Integer, 
        ForeignKey("processes.id", ondelete="SET NULL"), 
        nullable=True
    )

    name = Column(String(255), nullable=False)
    hsn_code = Column(String(20), nullable=True)
    po_number = Column(String(50), nullable=True)
    casting_weight = Column(Numeric(10, 3), default=0)
    scrap_weight = Column(Numeric(10, 3), default=0)
    rate = Column(Numeric(10, 2), nullable=False)
    barcode = Column(String(50), unique=True, nullable=True)
    is_active = Column(Boolean, default=True)

    company = relationship(Company)
    financial_year = relationship(FinancialYear)
    party = relationship(Party)
    process = relationship(Process)
