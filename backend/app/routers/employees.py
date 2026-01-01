from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import extract, and_, func
from typing import List, Optional
from datetime import date
from calendar import monthrange
import shutil
import os
from jinja2 import Environment, FileSystemLoader

from app.services.pdf_service import generate_pdf

from app.database.session import get_db
from app.models.user import User, UserRole
from app.models.employee_profile import EmployeeProfile, SalaryType
from app.models.attendance import Attendance, AttendanceStatus
from app.models.salary_advance import SalaryAdvance
from app.schemas.user import (
    UserCreate, UserResponse, UserUpdate, 
    AttendanceCreate, AttendanceResponse, SalarySlip,
    SalaryAdvanceCreate, SalaryAdvanceResponse
)
from app.core.dependencies import get_company_id
from app.core.security import get_password_hash

router = APIRouter(prefix="/employees", tags=["Employees"])

# ================================
# EMPLOYEE CRUD
# ================================

@router.get("/", response_model=List[UserResponse])
def get_employees(
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    users = db.query(User).options(
        joinedload(User.employee_profile)
    ).filter(
        User.company_id == company_id,
        User.role == UserRole.USER
    ).all()
    return users

@router.get("/next-id")
def get_next_employee_id(
    db: Session = Depends(get_db)
):
    max_id = db.query(func.max(User.id)).scalar() or 0
    return {"next_id": max_id + 1}

@router.post("/", response_model=UserResponse)
def create_employee(
    data: UserCreate,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    # Check if email exists (only if provided)
    if data.email:
        existing = db.query(User).filter(User.email == data.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

    # Create User
    pwd_hash = get_password_hash(data.password) if data.password else None
    
    user = User(
        name=data.name,
        email=data.email,
        password_hash=pwd_hash,
        role=UserRole.USER,
        company_id=company_id,
        is_active=True
    )
    db.add(user)
    db.flush() # Get ID

    # Create Profile
    if data.profile:
        profile = EmployeeProfile(
            user_id=user.id,
            designation=data.profile.designation,
            phone=data.profile.phone,
            address=data.profile.address,
            pan_number=data.profile.pan_number,
            aadhar_number=data.profile.aadhar_number,
            joining_date=data.profile.joining_date,
            salary_type=data.profile.salary_type,
            base_salary=data.profile.base_salary
        )
        db.add(profile)
    else:
        # Create default empty profile
        db.add(EmployeeProfile(user_id=user.id))

    db.commit()
    db.refresh(user)
    return user

@router.put("/{user_id}", response_model=UserResponse)
def update_employee(
    user_id: int,
    data: UserUpdate,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.id == user_id, 
        User.company_id == company_id,
        User.role == UserRole.USER
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")

    if data.name: user.name = data.name
    if data.email is not None: user.email = data.email 
    if data.password: user.password_hash = get_password_hash(data.password)
    if data.is_active is not None: user.is_active = data.is_active
    
    # Update Profile
    if data.profile:
        profile = db.query(EmployeeProfile).filter(EmployeeProfile.user_id == user.id).first()
        if not profile:
            profile = EmployeeProfile(user_id=user.id)
            db.add(profile)
        
        if data.profile.designation: profile.designation = data.profile.designation
        if data.profile.phone: profile.phone = data.profile.phone
        if data.profile.address: profile.address = data.profile.address
        if data.profile.pan_number: profile.pan_number = data.profile.pan_number
        if data.profile.aadhar_number: profile.aadhar_number = data.profile.aadhar_number
        if data.profile.salary_type: profile.salary_type = data.profile.salary_type
        if data.profile.base_salary is not None: profile.base_salary = data.profile.base_salary
        if data.profile.joining_date: profile.joining_date = data.profile.joining_date

    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}")
def delete_employee(
    user_id: int,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.id == user_id,
        User.company_id == company_id,
        User.role == UserRole.USER
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")

    db.delete(user)
    db.commit()

    # Clean up uploaded documents
    upload_dir = f"uploads/{user_id}"
    if os.path.exists(upload_dir):
        shutil.rmtree(upload_dir)

    return {"message": "Employee deleted"}

# ================================
# ATTENDANCE
# ================================

@router.post("/attendance")
def mark_attendance(
    records: List[AttendanceCreate],
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Mark attendance for multiple users for a specific date (bulk) or single"""
    count = 0
    for record in records:
        # Validate user belongs to company
        user = db.query(User).filter(User.id == record.user_id, User.company_id == company_id).first()
        if not user:
            continue
            
        # Check existing
        existing = db.query(Attendance).filter(
            Attendance.user_id == record.user_id,
            Attendance.date == record.date
        ).first()

        if existing:
            existing.status = record.status
            existing.notes = record.notes
            existing.overtime_hours = record.overtime_hours
            existing.bonus_amount = record.bonus_amount
        else:
            new_record = Attendance(
                user_id=record.user_id,
                date=record.date,
                status=record.status,
                notes=record.notes,
                overtime_hours=record.overtime_hours,
                bonus_amount=record.bonus_amount
            )
            db.add(new_record)
        count += 1
    
    db.commit()
    return {"message": f"Marked attendance for {count} employees"}

@router.get("/{user_id}/attendance")
def get_attendance(
    user_id: int,
    month: int,
    year: int,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    attendance = db.query(Attendance).filter(
        Attendance.user_id == user_id,
        extract('month', Attendance.date) == month,
        extract('year', Attendance.date) == year
    ).all()
    return attendance

@router.get("/attendance/monthly")
def get_monthly_attendance(
    month: int,
    year: int,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Get all attendance records for the company for a specific month"""
    records = db.query(Attendance).join(User).filter(
        User.company_id == company_id,
        extract('month', Attendance.date) == month,
        extract('year', Attendance.date) == year
    ).all()
    return records

# ================================
# SALARY ADVANCE
# ================================

@router.post("/advances", response_model=SalaryAdvanceResponse)
def create_salary_advance(
    data: SalaryAdvanceCreate,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    # Verify user
    user = db.query(User).filter(User.id == data.user_id, User.company_id == company_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")

    advance = SalaryAdvance(
        user_id=data.user_id,
        amount=data.amount,
        date=data.date,
        reason=data.reason,
        is_deducted=data.is_deducted
    )
    db.add(advance)
    db.commit()
    db.refresh(advance)
    return advance

@router.get("/{user_id}/advances", response_model=List[SalaryAdvanceResponse])
def get_salary_advances(
    user_id: int,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    # Verify user
    user = db.query(User).filter(User.id == user_id, User.company_id == company_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")

    advances = db.query(SalaryAdvance).filter(
        SalaryAdvance.user_id == user_id
    ).order_by(SalaryAdvance.date.desc()).all()
    return advances

@router.get("/attendance/daily")
def get_daily_attendance(
    date_str: date,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Get all attendance records for a specific date"""
    records = db.query(Attendance).join(User).filter(
        User.company_id == company_id,
        Attendance.date == date_str
    ).all()
    return records

# ================================
# SALARY
# ================================

@router.get("/{user_id}/salary", response_model=SalarySlip)
def calculate_salary(
    user_id: int,
    month: int,
    year: int,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    user = db.query(User).options(joinedload(User.employee_profile)).filter(
        User.id == user_id,
        User.company_id == company_id
    ).first()

    if not user or not user.employee_profile:
        raise HTTPException(status_code=404, detail="Employee or profile not found")

    profile = user.employee_profile
    base_salary = float(profile.base_salary)
    
    # Get attendance
    records = db.query(Attendance).filter(
        Attendance.user_id == user_id,
        extract('month', Attendance.date) == month,
        extract('year', Attendance.date) == year
    ).all()

    present_days = 0.0
    total_overtime_pay = 0.0
    total_bonus = 0.0

    # Calculate hourly rate for Overtime (Assuming 30 days/8 hours)
    hourly_rate = (base_salary / 30) / 8

    for r in records:
        if r.status == AttendanceStatus.PRESENT:
            present_days += 1.0
        elif r.status == AttendanceStatus.HALF_DAY:
            present_days += 0.5
        
        # Add OT and Bonus
        if r.overtime_hours:
            total_overtime_pay += float(r.overtime_hours) * hourly_rate
        if r.bonus_amount:
            total_bonus += float(r.bonus_amount)
    
    # Logic
    _, days_in_month = monthrange(year, month)
    calculated_amount = 0.0
    
    if profile.salary_type == SalaryType.MONTHLY:
        daily_rate = base_salary / days_in_month
        calculated_amount = daily_rate * present_days
        
    elif profile.salary_type == SalaryType.DAILY:
        calculated_amount = base_salary * present_days

    # Calculate Advances (Get all advances for this month)
    advances = db.query(SalaryAdvance).filter(
        SalaryAdvance.user_id == user_id,
        extract('month', SalaryAdvance.date) == month,
        extract('year', SalaryAdvance.date) == year
    ).all()
    
    total_advances = sum([float(a.amount) for a in advances])

    final_payable = calculated_amount + total_overtime_pay + total_bonus - total_advances

    return SalarySlip(
        user_id=user_id,
        month=f"{year}-{month:02d}",
        base_salary=base_salary,
        salary_type=profile.salary_type.value,
        total_days=days_in_month,
        present_days=present_days,
        total_overtime_pay=round(total_overtime_pay, 2),
        total_bonus=round(total_bonus, 2),
        total_advances_deducted=round(total_advances, 2),
        final_payable=round(final_payable, 2)
    )

# ================================
# DOCUMENTS
# ================================

@router.post("/{user_id}/upload")
def upload_document(
    user_id: int,
    doc_type: str = Form(...), # pan, aadhar, resume
    file: UploadFile = File(...),
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id, User.company_id == company_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    # Ensure uploads directory
    base_dir = "uploads"
    user_dir = os.path.join(base_dir, str(user_id))
    os.makedirs(user_dir, exist_ok=True)
    
    # Save file
    file_path = os.path.join(user_dir, f"{doc_type}_{file.filename}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Update Profile
    profile = db.query(EmployeeProfile).filter(EmployeeProfile.user_id == user_id).first()
    if not profile:
        profile = EmployeeProfile(user_id=user_id)
        db.add(profile)
        
    if doc_type == "pan":
        profile.pan_doc_path = file_path
    elif doc_type == "aadhar":
        profile.aadhar_doc_path = file_path
    elif doc_type == "resume":
        profile.resume_doc_path = file_path
        
    db.commit()
    
    return {"message": "File uploaded", "path": file_path}

# ================================
# PDF GENERATION
# ================================

templates_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
env = Environment(loader=FileSystemLoader(templates_dir))

@router.get("/{user_id}/salary/pdf")
async def get_salary_slip_pdf(
    user_id: int,
    month: int,
    year: int,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    # 1. Calculate Salary Data
    try:
        # We call the synchronous function directly
        salary_slip = calculate_salary(user_id=user_id, month=month, year=year, company_id=company_id, db=db)
    except HTTPException as e:
        raise e
        
    # 2. Fetch User & Company Details
    user = db.query(User).options(joinedload(User.employee_profile)).filter(
        User.id == user_id, 
        User.company_id == company_id
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    company = user.company # Assuming relationship exists
    
    # 3. Prepare Template Context
    month_name = date(year, month, 1).strftime("%B")
    
    # Reverse calculate base earned
    earned_basic = salary_slip.final_payable - salary_slip.total_overtime_pay - salary_slip.total_bonus + salary_slip.total_advances_deducted
    
    template = env.get_template("salary_slip.html")
    html_content = template.render(
        company=company,
        employee=user,
        month_name=month_name,
        year=year,
        base_salary=f"{salary_slip.base_salary:,.2f}",
        total_days=salary_slip.total_days,
        present_days=salary_slip.present_days,
        total_overtime_pay=f"{salary_slip.total_overtime_pay:,.2f}",
        total_bonus=f"{salary_slip.total_bonus:,.2f}",
        total_earnings=f"{(earned_basic + salary_slip.total_overtime_pay + salary_slip.total_bonus):,.2f}",
        calculated_amount=f"{earned_basic:,.2f}",
        total_advances_deducted=f"{salary_slip.total_advances_deducted:,.2f}",
        total_deductions=f"{salary_slip.total_advances_deducted:,.2f}",
        final_payable=f"{salary_slip.final_payable:,.2f}",
        generated_date=date.today().strftime("%d-%m-%Y")
    )
    
    # 4. Generate PDF
    pdf_content = await generate_pdf(html_content)
    
    filename = f"SalarySlip_{user.name}_{month_name}{year}.pdf"
    
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )
