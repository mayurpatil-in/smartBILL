from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Response, Request, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import extract, and_, func
from typing import List, Optional
from datetime import date, datetime
from calendar import monthrange
import shutil
import os
import qrcode
import io
import base64
from jose import jwt
from app.core.config import settings
from jinja2 import Environment, FileSystemLoader

from app.services.pdf_service import generate_pdf

from app.database.session import get_db
from app.models.user import User
from app.core.paths import UPLOAD_DIR
from app.models.employee_profile import EmployeeProfile, SalaryType
from app.models.attendance import Attendance, AttendanceStatus
from app.models.salary_advance import SalaryAdvance
from app.models.holiday import Holiday
from app.models.company import Company
from app.models.role import Role
from app.schemas.user import (
    UserCreate, UserResponse, UserUpdate, 
    AttendanceCreate, AttendanceResponse, SalarySlip,
    SalaryAdvanceCreate, SalaryAdvanceResponse
)
from app.core.dependencies import get_company_id, get_active_financial_year, get_current_user
from app.core.security import get_password_hash
from app.models.expense import Expense

router = APIRouter(prefix="/employees", tags=["Employees"])

# ================================
# EMPLOYEE SELF-SERVICE PORTAL
# ================================

@router.get("/me/profile")
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current employee's profile information
    """
    user = db.query(User).options(joinedload(User.employee_profile), joinedload(User.role)).filter(
        User.id == current_user.id
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user


@router.get("/me/attendance")
def get_my_attendance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    month: int = 1,
    year: int = 2026
):
    """
    Get current employee's attendance for a specific month
    """
    records = db.query(Attendance).filter(
        Attendance.user_id == current_user.id,
        extract('month', Attendance.date) == month,
        extract('year', Attendance.date) == year
    ).order_by(Attendance.date).all()
    
    # Calculate summary
    present_days = sum(1 for r in records if r.status == AttendanceStatus.PRESENT)
    half_days = sum(1 for r in records if r.status == AttendanceStatus.HALF_DAY)
    absent_days = sum(1 for r in records if r.status == AttendanceStatus.ABSENT)
    leave_days = sum(1 for r in records if r.status == AttendanceStatus.LEAVE)
    total_overtime = sum(float(r.overtime_hours or 0) for r in records)
    total_bonus = sum(float(r.bonus_amount or 0) for r in records)
    
    # [NEW] Fetch Holidays
    holidays = db.query(Holiday).filter(
        Holiday.company_id == current_user.company_id,
        extract('month', Holiday.date) == month,
        extract('year', Holiday.date) == year
    ).all()
    
    # [NEW] Fetch Company Off Days
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    off_days = company.off_days if company and company.off_days else []
    
    return {
        "records": records,
        "summary": {
            "present_days": present_days,
            "half_days": half_days,
            "absent_days": absent_days,
            "leave_days": leave_days,
            "holidays_count": len(holidays),
            "total_overtime_hours": total_overtime,
            "total_bonus": total_bonus
        },
        "holidays": holidays,
        "off_days": off_days
    }


@router.get("/me/salary-slips")
def get_my_salary_slips(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get list of months where salary was paid for current employee
    """
    # Get all salary expenses for this employee
    expenses = db.query(Expense).filter(
        Expense.category == "Salary",
        Expense.payee_name == current_user.name,
        Expense.company_id == current_user.company_id
    ).order_by(Expense.date.desc()).all()
    
    # Parse month/year from description (format: "Salary for Name - Month Year")
    salary_slips = []
    for expense in expenses:
        try:
            # Extract month and year from description
            # Example: "Salary for John Doe - September 2024"
            parts = expense.description.split(" - ")
            if len(parts) == 2:
                month_year_str = parts[1].strip()
                month_year_parts = month_year_str.split()
                if len(month_year_parts) == 2:
                    month_name = month_year_parts[0]
                    year = int(month_year_parts[1])
                    
                    # Convert month name to number
                    month_map = {
                        "January": 1, "February": 2, "March": 3, "April": 4,
                        "May": 5, "June": 6, "July": 7, "August": 8,
                        "September": 9, "October": 10, "November": 11, "December": 12
                    }
                    month = month_map.get(month_name)
                    
                    if month:
                        salary_slips.append({
                            "month": month,
                            "year": year,
                            "month_name": month_name,
                            "amount": float(expense.amount),
                            "payment_date": expense.date,
                            "payment_method": expense.payment_method
                        })
        except:
            continue
    
    return salary_slips


@router.get("/me/salary-slip/{month}/{year}/pdf")
async def download_my_salary_slip(
    month: int,
    year: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Download salary slip PDF for current employee
    """
    # Reuse the existing salary slip PDF generation
    try:
        salary_slip = calculate_salary(
            user_id=current_user.id,
            month=month,
            year=year,
            company_id=current_user.company_id,
            db=db
        )
    except HTTPException as e:
        raise e
    
    # Fetch User & Company Details
    user = db.query(User).options(joinedload(User.employee_profile)).filter(
        User.id == current_user.id,
        User.company_id == current_user.company_id
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    company = user.company
    
    # Prepare Template Context
    month_name = date(year, month, 1).strftime("%B")
    
    # Reverse calculate base earned
    # Reverse calculate base earned
    # Final = EarnedBasic + OT + Bonus - Advances - Tax
    # EarnedBasic = Final - OT - Bonus + Advances + Tax
    # Reverse calculate base earned
    # Final = EarnedBasic + OT + Bonus - Advances - Tax - PT
    # EarnedBasic = Final - OT - Bonus + Advances + Tax + PT
    earned_basic = salary_slip.final_payable - salary_slip.total_overtime_pay - salary_slip.total_bonus + salary_slip.total_advances_deducted + salary_slip.tax_deduction + salary_slip.professional_tax_deduction
    
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
        tax_deduction=f"{salary_slip.tax_deduction:,.2f}",
        professional_tax_deduction=f"{salary_slip.professional_tax_deduction:,.2f}",
        total_deductions=f"{(salary_slip.total_advances_deducted + salary_slip.tax_deduction + salary_slip.professional_tax_deduction):,.2f}",
        final_payable=f"{salary_slip.final_payable:,.2f}",
        generated_date=date.today().strftime("%d-%m-%Y")
    )
    
    # Generate PDF
    pdf_content = await generate_pdf(html_content)
    
    filename = f"SalarySlip_{user.name}_{month_name}{year}.pdf"
    
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )

# ================================
# EMPLOYEE CRUD
# ================================

@router.get("/", response_model=List[UserResponse])
def get_employees(
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    try:
        # Get only users with "Employee" role
        # Debug print
        print(f"Fetching employees for company_id: {company_id}")
        
        users = db.query(User).join(Role).options(
            joinedload(User.employee_profile),
            joinedload(User.role)
        ).filter(
            User.company_id == company_id,
            Role.name == "Employee"
        ).all()
        
        print(f"Found {len(users)} employees")
        return users
    except Exception as e:
        print(f"CRITICAL ERROR in get_employees: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


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
            if existing.company_id == company_id:
                raise HTTPException(status_code=400, detail="Email already exists in your company")
            else:
                raise HTTPException(status_code=400, detail="Email is already associated with another company account")

    # Create User
    pwd_hash = get_password_hash(data.password) if data.password else None
    
    # For employees created through this endpoint, assign "Employee" role by default
    # Get the Employee role from the database
    from app.models.role import Role
    employee_role = db.query(Role).filter(Role.name == "Employee", Role.is_system_role == True).first()
    
    # If Employee role doesn't exist, try to find any role or set to None
    if not employee_role:
        # Try to find any non-Super Admin role as fallback
        employee_role = db.query(Role).filter(
            Role.name != "Super Admin",
            Role.is_system_role == True
        ).first()
    
    user = User(
        name=data.name,
        email=data.email,
        password_hash=pwd_hash,
        role_id=employee_role.id if employee_role else None,
        legacy_role="USER",
        company_id=company_id,
        is_active=True
    )
    db.add(user)
    db.flush() # Get ID

    # Calculate Next Company-Specific Employee ID
    # Get Max ID for this company from EmployeeProfiles
    # Note: We need to join User to filter by company_id because EmployeeProfile doesn't store company_id directly (it's on User)
    last_emp_id = db.query(func.max(EmployeeProfile.company_employee_id)).join(User).filter(
        User.company_id == company_id
    ).scalar() or 0
    next_company_emp_id = last_emp_id + 1

    # Create Profile
    if data.profile:
        profile = EmployeeProfile(
            user_id=user.id,
            company_employee_id=next_company_emp_id, # <--- Save Company ID
            designation=data.profile.designation,
            phone=data.profile.phone,
            address=data.profile.address,
            pan_number=data.profile.pan_number,
            aadhar_number=data.profile.aadhar_number,
            joining_date=data.profile.joining_date,
            salary_type=data.profile.salary_type,
            base_salary=data.profile.base_salary,
            work_hours_per_day=data.profile.work_hours_per_day or 8
        )
        db.add(profile)
    else:
        # Create default empty profile
        db.add(EmployeeProfile(
            user_id=user.id,
            company_employee_id=next_company_emp_id
        ))

    db.commit()
    db.refresh(user)
    return user

@router.get("/next-id")
def get_next_employee_id(
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    last_emp_id = db.query(func.max(EmployeeProfile.company_employee_id)).join(User).filter(
        User.company_id == company_id
    ).scalar() or 0
    return {"next_id": last_emp_id + 1}



@router.put("/{user_id}", response_model=UserResponse)
def update_employee(
    user_id: int,
    data: UserUpdate,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.id == user_id, 
        User.company_id == company_id
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
        
        # Update Tax/TDS info
        if data.profile.professional_tax is not None: profile.professional_tax = data.profile.professional_tax
        if data.profile.tds_percentage is not None: profile.tds_percentage = data.profile.tds_percentage
        if data.profile.tds_percentage is not None: profile.tds_percentage = data.profile.tds_percentage
        if data.profile.enable_tds is not None: profile.enable_tds = data.profile.enable_tds
        if data.profile.work_hours_per_day is not None: profile.work_hours_per_day = data.profile.work_hours_per_day

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
        User.company_id == company_id
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")

    db.delete(user)
    db.commit()

    # Clean up uploaded documents
    upload_dir = os.path.join(UPLOAD_DIR, str(user_id))
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
    
    # [NEW] Fetch Holidays
    holidays = db.query(Holiday).filter(
        Holiday.company_id == company_id,
        extract('month', Holiday.date) == month,
        extract('year', Holiday.date) == year
    ).all()
    
    # [NEW] Fetch Company Off Days
    company = db.query(Company).filter(Company.id == company_id).first()
    off_days = company.off_days if company and company.off_days else []
    
    return {
        "records": records, 
        "holidays": holidays,
        "off_days": off_days
    }

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
    base_salary = float(profile.base_salary or 0.0)
    
    # Get attendance
    records = db.query(Attendance).filter(
        Attendance.user_id == user_id,
        extract('month', Attendance.date) == month,
        extract('year', Attendance.date) == year
    ).all()

    present_days = 0.0
    total_overtime_pay = 0.0
    total_bonus = 0.0

    # Calculate hourly rate for Overtime (Assuming 30 days/work_hours)
    daily_work_hours = float(profile.work_hours_per_day) if profile.work_hours_per_day else 8.0
    hourly_rate = (base_salary / 30) / daily_work_hours

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
    
    # [NEW] Add Holidays to Present Days (if no attendance marked)
    holidays = db.query(Holiday).filter(
        Holiday.company_id == company_id,
        extract('month', Holiday.date) == month,
        extract('year', Holiday.date) == year
    ).all()
    
    holiday_dates = {h.date for h in holidays}
    attended_dates = {r.date for r in records}
    
    for h_date in holiday_dates:
        # If no attendance marked for this holiday, count as full paid day
        if h_date not in attended_dates:
            present_days += 1.0
            
    # [NEW] Add Weekly Off Days (e.g. Sundays) to Present Days
    company = db.query(Company).filter(Company.id == company_id).first()
    off_days = company.off_days if company and company.off_days else [] # List of ints [0-6]
    
    if off_days:
        from calendar import monthrange
        _, days_in_month_count = monthrange(year, month)
        
        for day in range(1, days_in_month_count + 1):
             current_date = date(year, month, day)
             # If it is an off day (e.g. Sunday=6)
             if current_date.weekday() in off_days:
                 # If not already counted as holiday AND not attended (marked absent/present manually)
                 if current_date not in holiday_dates and current_date not in attended_dates:
                     present_days += 1.0
    
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

    total_advances = sum([float(a.amount) for a in advances])

    # final_payable calculated later after tax

    # Check if already paid
    # Construct description to match pay_salary logic
    month_name = date(year, month, 1).strftime("%B")
    expected_desc = f"Salary for {user.name} - {month_name} {year}"
    
    existing_expense = db.query(Expense).filter(
        Expense.category == "Salary",
        Expense.description == expected_desc,
        Expense.company_id == company_id
    ).first()
    
    # Calculate Tax (TDS)
    # Gross Earnings = Base Pay + OT + Bonus
    gross_earnings = calculated_amount + total_overtime_pay + total_bonus
    if profile.enable_tds:
        tds_percentage = float(profile.tds_percentage) if profile.tds_percentage else 0.0
        tax_deduction = (gross_earnings * tds_percentage) / 100
    else:
        tax_deduction = 0.0
    
    # Professional Tax (Fixed Amount)
    professional_tax = float(profile.professional_tax) if profile.professional_tax else 0.0
    
    final_payable = gross_earnings - total_advances - tax_deduction - professional_tax
    
    is_paid = existing_expense is not None

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
        tax_deduction=round(tax_deduction, 2),
        professional_tax_deduction=round(professional_tax, 2),
        final_payable=round(final_payable, 2),
        is_paid=is_paid
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
    user_dir = os.path.join(UPLOAD_DIR, str(user_id))
    os.makedirs(user_dir, exist_ok=True)
    
    # Save file
    safe_filename = f"{doc_type}_{file.filename}"
    file_path = os.path.join(user_dir, safe_filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Relative path for DB and Frontend (must match static mount "uploads")
    # Format: uploads/{user_id}/{filename}
    db_path = f"uploads/{user_id}/{safe_filename}"
        
    # Update Profile
    profile = db.query(EmployeeProfile).filter(EmployeeProfile.user_id == user_id).first()
    if not profile:
        profile = EmployeeProfile(user_id=user_id)
        db.add(profile)
        
    if doc_type == "pan":
        profile.pan_doc_path = db_path
    elif doc_type == "aadhar":
        profile.aadhar_doc_path = db_path
    elif doc_type == "resume":
        profile.resume_doc_path = db_path
    elif doc_type == "photo":
        profile.photo_path = db_path
        
    db.commit()
    
    return {"message": "File uploaded", "path": db_path}

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
    earned_basic = salary_slip.final_payable - salary_slip.total_overtime_pay - salary_slip.total_bonus + salary_slip.total_advances_deducted + salary_slip.tax_deduction + salary_slip.professional_tax_deduction
    
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
        tax_deduction=f"{salary_slip.tax_deduction:,.2f}",
        professional_tax_deduction=f"{salary_slip.professional_tax_deduction:,.2f}",
        total_deductions=f"{(salary_slip.total_advances_deducted + salary_slip.tax_deduction + salary_slip.professional_tax_deduction):,.2f}",
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

@router.post("/{user_id}/salary/pay")
def pay_salary(
    user_id: int,
    month: int,
    year: int,
    payment_method: str = "Cash",
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    """
    Calculates the final payable salary and creates an Expense record.
    """
    # 1. Calculate Salary (Reuse logic)
    try:
        slip = calculate_salary(user_id, month, year, company_id, db)
    except HTTPException as e:
        raise e
    
    if slip.is_paid:
        raise HTTPException(status_code=400, detail="Salary already paid for this month")
    
    if slip.final_payable <= 0:
        raise HTTPException(status_code=400, detail="Net payable amount is zero or negative")

    # 2. Get Employee Name
    user = db.query(User).filter(User.id == user_id).first()
    emp_name = user.name if user else "Employee"
    month_name = date(year, month, 1).strftime("%B")

    # 3. Create Expense
    expense = Expense(
        company_id=company_id,
        financial_year_id=fy.id,
        date=date.today(),
        category="Salary",
        description=f"Salary for {emp_name} - {month_name} {year}",
        amount=slip.final_payable,
        payment_method=payment_method,
        payee_name=emp_name,  # Add employee name for cheque printing
        status="PAID"
    )
    
    db.add(expense)
    db.commit()
    db.refresh(expense)
    
    return {"message": "Salary paid and expense created", "expense_id": expense.id}


@router.get("/{user_id}/id-card/pdf")
async def get_id_card_pdf(
    user_id: int,
    request: Request,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    # 1. Fetch User
    user = db.query(User).options(joinedload(User.employee_profile)).filter(
        User.id == user_id, 
        User.company_id == company_id
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    company = user.company
    
    # 2. Generate QR Code (VCard format or just info)
    # Simple VCard
    # 2. Generate QR Code (Verification URL)
    # Attempt to determine frontend URL from referer (best guess for client origin)
    referer = request.headers.get("referer")
    if referer:
        # referer example: http://localhost:5173/employees
        base_url = "/".join(referer.split("/")[:3]) 
    else:
        # Fallback
        base_url = f"{request.url.scheme}://{request.url.hostname}:5173"
        
    # Generate Secure Token
    token_payload = {"sub": str(user.id), "type": "verification"}
    token = jwt.encode(token_payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    
    verification_url = f"{base_url}/verify-id/{user.id}?token={token}"
    
    qr = qrcode.QRCode(box_size=2, border=1)
    qr.add_data(verification_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    qr_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
    
    # 3. Render Template
    # Base URL for images
    request_base_url = str(request.base_url).rstrip("/")
    
    template = env.get_template("id_card.html")
    html_content = template.render(
        company=company,
        employee=user,
        qr_code_base64=qr_base64,
        request_base_url=request_base_url
    )
    
    # 4. Generate PDF
    # ID Card Dimensions approx 2.125 x 3.375 inches
    # We might need to pass custom options to generate_pdf if it supports size args,
    # otherwise CSS @page should handle it with proper print options.
    pdf_content = await generate_pdf(html_content)
    
    filename = f"IDCard_{user.name}.pdf"
    
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )


# ================================

