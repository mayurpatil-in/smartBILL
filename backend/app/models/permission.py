from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import relationship
from app.database.base import Base


class Permission(Base):
    __tablename__ = "permissions"
    
    id = Column(Integer, primary_key=True, index=True)
    module = Column(String(50), nullable=False)  # e.g., "invoices", "parties", "expenses"
    action = Column(String(50), nullable=False)  # e.g., "view", "create", "edit", "delete"
    code = Column(String(100), unique=True, nullable=False, index=True)  # e.g., "invoices.create"
    description = Column(Text)
    
    # Relationships
    roles = relationship("RolePermission", back_populates="permission")
