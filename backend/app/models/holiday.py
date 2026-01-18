from sqlalchemy import Column, Integer, String, Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database.base import Base

class Holiday(Base):
    __tablename__ = "holidays"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("company.id"), nullable=False)
    name = Column(String, nullable=False)
    date = Column(Date, nullable=False)

    # Relationships
    company = relationship("Company", back_populates="holidays")

    __table_args__ = (
        UniqueConstraint('company_id', 'date', name='unique_company_holiday_date'),
    )
