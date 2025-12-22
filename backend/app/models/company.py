from sqlalchemy import Column, Integer, String
from app.database.base import Base


class Company(Base):
    __tablename__ = "company"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    gst_number = Column(String(20), unique=True, nullable=True)
    address = Column(String, nullable=True)
    phone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
