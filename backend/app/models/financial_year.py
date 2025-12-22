from sqlalchemy import Column, Integer, Date, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from app.database.base import Base
from app.models.company import Company


class FinancialYear(Base):
    __tablename__ = "financial_year"

    id = Column(Integer, primary_key=True, index=True)

    company_id = Column(
        Integer,
        ForeignKey("company.id", ondelete="CASCADE"),
        nullable=False
    )

    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)

    is_active = Column(Boolean, default=False)
    is_locked = Column(Boolean, default=False)

    company = relationship(Company)
