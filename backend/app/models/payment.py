from sqlalchemy import Column, Integer, String, Numeric, Date, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.database.base import Base
from app.models.company import Company
from app.models.financial_year import FinancialYear
from app.models.party import Party

import enum

class PaymentType(str, enum.Enum):
    RECEIVED = "RECEIVED"
    PAID = "PAID"

class PaymentMode(str, enum.Enum):
    CASH = "CASH"
    BANK_TRANSFER = "BANK_TRANSFER"
    CHEQUE = "CHEQUE"
    UPI = "UPI"
    OTHER = "OTHER"

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    
    company_id = Column(Integer, ForeignKey("company.id"), nullable=False)
    financial_year_id = Column(Integer, ForeignKey("financial_year.id"), nullable=False)
    party_id = Column(Integer, ForeignKey("party.id"), nullable=False)
    
    payment_date = Column(Date, nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    payment_type = Column(String(50), default=PaymentType.RECEIVED, nullable=False) # Store as string for SQLite compatibility if needed, but Enum class used in app
    payment_mode = Column(String(50), default=PaymentMode.CASH, nullable=False)
    
    reference_number = Column(String(100), nullable=True) # Cheque No, Transaction ID
    notes = Column(String(500), nullable=True)
    
    # Relationships
    company = relationship(Company)
    financial_year = relationship(FinancialYear)
    party = relationship(Party)
    allocations = relationship("PaymentAllocation", backref="payment", cascade="all, delete-orphan")
