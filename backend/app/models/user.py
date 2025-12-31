from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.database.base import Base
import enum


class UserRole(enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    COMPANY_ADMIN = "COMPANY_ADMIN"
    USER = "USER"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    # SUPER_ADMIN → company_id = NULL
    company_id = Column(
        Integer,
        ForeignKey("company.id", ondelete="CASCADE"),
        nullable=True
    )

    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=True)
    password_hash = Column(String(255), nullable=True)

    # 👇 MUST MATCH POSTGRES ENUM EXACTLY
    role = Column(Enum(UserRole, name="userrole"), nullable=False)

    is_active = Column(Boolean, default=True)

    # 🔁 Relationship
    company = relationship("Company", back_populates="users")
    employee_profile = relationship("EmployeeProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    attendance_logs = relationship("Attendance", back_populates="user", cascade="all, delete-orphan")
    salary_advances = relationship("SalaryAdvance", back_populates="user", cascade="all, delete-orphan")
