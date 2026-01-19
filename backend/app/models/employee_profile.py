from sqlalchemy import Column, Integer, String, Date, ForeignKey, Numeric, Enum, Boolean
from sqlalchemy.orm import relationship
import enum

from app.database.base import Base

class SalaryType(str, enum.Enum):
    MONTHLY = "monthly"
    DAILY = "daily"

class EmployeeProfile(Base):
    __tablename__ = "employee_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    # Custom Company-Specific Employee ID (e.g. 1, 2, 3...)
    company_employee_id = Column(Integer, nullable=True)
    
    designation = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)
    address = Column(String(255), nullable=True)
    pan_number = Column(String(20), nullable=True)
    aadhar_number = Column(String(20), nullable=True)
    
    # Document Paths
    pan_doc_path = Column(String(255), nullable=True)
    aadhar_doc_path = Column(String(255), nullable=True)
    resume_doc_path = Column(String(255), nullable=True)
    photo_path = Column(String(255), nullable=True)

    joining_date = Column(Date, nullable=True)
    
    salary_type = Column(Enum(SalaryType), default=SalaryType.MONTHLY)
    base_salary = Column(Numeric(12, 2), default=0.00)
    tds_percentage = Column(Numeric(5, 2), default=0.00) # Tax Deduction Percentage
    enable_tds = Column(Boolean, default=False) # Toggle TDS Deduction
    professional_tax = Column(Numeric(10, 2), default=0.00) # Fixed Professional Tax Amount
    work_hours_per_day = Column(Integer, default=8) # [NEW] Custom Daily Work Hours for Salary Calculation
    
    # Relationships
    user = relationship("User", back_populates="employee_profile")
