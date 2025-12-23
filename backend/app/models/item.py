from sqlalchemy import Column, Integer, String, Numeric, ForeignKey
from sqlalchemy.orm import relationship

from app.database.base import Base
from app.models.company import Company


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)

    company_id = Column(
        Integer,
        ForeignKey("company.id", ondelete="CASCADE"),
        nullable=False
    )

    name = Column(String(255), nullable=False)
    hsn_code = Column(String(20), nullable=True)
    unit = Column(String(50), nullable=True)
    rate = Column(Numeric(10, 2), nullable=False)

    company = relationship(Company)
