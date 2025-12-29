from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from app.database.base import Base
from app.models.company import Company
from app.models.financial_year import FinancialYear


class Process(Base):
    __tablename__ = "processes"

    id = Column(Integer, primary_key=True, index=True)
    
    company_id = Column(
        Integer,
        ForeignKey("company.id", ondelete="CASCADE"),
        nullable=False
    )

    name = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)

    company = relationship(Company)
