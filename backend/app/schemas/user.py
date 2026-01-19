from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import date
from decimal import Decimal
from app.models.user import UserRole
from app.models.employee_profile import SalaryType
from app.models.attendance import AttendanceStatus

# ========================
# EMPLOYEE PROFILE SCHEMAS
# ========================
class EmployeeProfileBase(BaseModel):
    designation: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    pan_number: Optional[str] = None
    aadhar_number: Optional[str] = None
    
    pan_doc_path: Optional[str] = None
    aadhar_doc_path: Optional[str] = None
    resume_doc_path: Optional[str] = None
    photo_path: Optional[str] = None

    joining_date: Optional[date] = None
    salary_type: SalaryType = SalaryType.MONTHLY
    base_salary: Decimal = 0.00
    tds_percentage: Optional[Decimal] = 0.00
    enable_tds: Optional[bool] = False
    professional_tax: Optional[Decimal] = 0.00
    work_hours_per_day: Optional[int] = 8

class EmployeeProfileCreate(EmployeeProfileBase):
    pass

class EmployeeProfileResponse(EmployeeProfileBase):
    id: int
    user_id: int
    company_employee_id: Optional[int] = None

    class Config:
        from_attributes = True

# ========================
# USER SCHEMAS
# ========================
from pydantic import Field, field_validator

class UserBase(BaseModel):
    name: str
    email: Optional[EmailStr] = None

class UserCreate(UserBase):
    password: Optional[str] = None
    role_id: Optional[int] = None
    profile: Optional[EmployeeProfileCreate] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    role_id: Optional[int] = None
    profile: Optional[EmployeeProfileCreate] = None

class UserResponse(UserBase):
    id: int
    company_id: Optional[int]
    is_active: bool
    employee_profile: Optional[EmployeeProfileResponse] = None
    
    role: Optional[str] = None
    role_id: Optional[int] = None

    class Config:
        from_attributes = True
        
    @field_validator('role', mode='before')
    def extract_role_name(cls, v):
        # Handle case where v is the Role object relationship
        if hasattr(v, 'name'):
            return v.name
        # Handle case where v is a string (legacy)
        if isinstance(v, str):
            return v
        return None

# ========================
# ATTENDANCE SCHEMAS
# ========================
class AttendanceBase(BaseModel):
    date: date
    status: AttendanceStatus = AttendanceStatus.PRESENT
    notes: Optional[str] = None
    overtime_hours: Decimal = 0.00
    bonus_amount: Decimal = 0.00

class AttendanceCreate(AttendanceBase):
    user_id: int

class AttendanceResponse(AttendanceBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

class AttendanceBulkCreate(BaseModel):
    date: date
    records: List[AttendanceCreate]

# ========================
# SALARY ADVANCE SCHEMAS
# ========================
class SalaryAdvanceBase(BaseModel):
    amount: Decimal
    date: date
    reason: Optional[str] = None
    is_deducted: bool = False

class SalaryAdvanceCreate(SalaryAdvanceBase):
    user_id: int

class SalaryAdvanceResponse(SalaryAdvanceBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

# ========================
# SALARY SLIP SCHEMAS
# ========================
class SalarySlip(BaseModel):
    user_id: int
    month: str # YYYY-MM
    base_salary: float
    salary_type: str
    total_days: int
    present_days: float # Half days count as 0.5
    
    
    # New Fields
    total_overtime_pay: float = 0.0
    total_bonus: float = 0.0
    total_advances_deducted: float = 0.0
    tax_deduction: float = 0.0
    professional_tax_deduction: float = 0.0
    
    
    final_payable: float
    is_paid: bool = False
