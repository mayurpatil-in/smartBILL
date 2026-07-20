from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from app.database.base import Base

class ShortLink(Base):
    __tablename__ = "short_link"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(15), unique=True, index=True, nullable=False)
    target_url = Column(Text, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
