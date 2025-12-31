from sqlalchemy import Column, Integer, String, Date, ForeignKey, Numeric, Boolean
from sqlalchemy.orm import relationship
from app.database.base import Base

class SalaryAdvance(Base):
    __tablename__ = "salary_advances"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    amount = Column(Numeric(10, 2), nullable=False)
    date = Column(Date, nullable=False)
    reason = Column(String(255), nullable=True)
    
    # Track if this advance has been fully deducted/paid back
    is_deducted = Column(Boolean, default=False)
    
    # Relationships
    user = relationship("User", back_populates="salary_advances")
