from sqlalchemy import Column, Integer, String, Numeric, Date, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import date

from app.database.base import Base
from app.models.company import Company
from app.models.financial_year import FinancialYear
from app.models.party import Party
# from app.models.user import User # Avoid circular import if user not needed as relationship

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    
    company_id = Column(Integer, ForeignKey("company.id", ondelete="CASCADE"), nullable=False)
    financial_year_id = Column(Integer, ForeignKey("financial_year.id", ondelete="CASCADE"), nullable=False)
    
    # Optional Party (Vendor) Link
    party_id = Column(Integer, ForeignKey("party.id", ondelete="SET NULL"), nullable=True)
    
    # Basic Details
    date = Column(Date, default=date.today, nullable=False)
    category = Column(String(100), nullable=False) # e.g., Rent, Salary, Travel
    description = Column(String, nullable=True)
    amount = Column(Numeric(12, 2), nullable=False)
    
    # Payment Info
    payment_method = Column(String(50), default="Cash") # Cash, Cheque, Online
    reference_no = Column(String(100), nullable=True) # UPI Ref, Transaction ID
    
    # Cheque Details (Only if payment_method == 'Cheque')
    cheque_no = Column(String(50), nullable=True)
    cheque_date = Column(Date, nullable=True)
    bank_name = Column(String(255), nullable=True)
    payee_name = Column(String(255), nullable=True) # Usually the Party name, but can be overridden
    
    # Recurring Template Config
    is_recurring = Column(Boolean, default=False)
    recurring_frequency = Column(String(50), nullable=True) # Monthly, Weekly, Yearly
    next_due_date = Column(Date, nullable=True)
    
    # Status
    # For standard expenses: 'PAID' (default)
    # For recurring templates: 'TEMPLATE'
    status = Column(String(50), default="PAID") 
    
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    company = relationship("Company")
    financial_year = relationship("FinancialYear")
    party = relationship("Party")
    # user = relationship("User")
