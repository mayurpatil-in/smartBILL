from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database.base import Base

class ClientLogin(Base):
    __tablename__ = "client_logins"

    id = Column(Integer, primary_key=True, index=True)
    
    party_id = Column(Integer, ForeignKey("party.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # Login Credentials
    username = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    
    is_active = Column(Boolean, default=True)

    # Relationships
    party = relationship("Party", backref="client_login")
