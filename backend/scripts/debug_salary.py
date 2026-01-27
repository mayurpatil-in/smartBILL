import sys
import os
from datetime import date
from calendar import monthrange
from sqlalchemy import create_engine, extract
from sqlalchemy.orm import sessionmaker, joinedload

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
from app.models.user import User
from app.models.role import Role
from app.models.role_permission import RolePermission
from app.models.permission import Permission
from app.models.attendance import Attendance, AttendanceStatus
from app.models.salary_advance import SalaryAdvance
from app.models.holiday import Holiday
from app.models.company import Company
from app.models.employee_profile import SalaryType

def debug_salary(user_id, month, year):
    print(f"Debugging Salary for User {user_id} | {month}/{year}")
    
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        user = db.query(User).options(joinedload(User.employee_profile)).filter(
            User.id == user_id
        ).first()

        if not user:
            print("User not found")
            return
        
        if not user.employee_profile:
            print("Profile not found")
            return

        profile = user.employee_profile
        company_id = user.company_id
        
        print(f"User: {user.name}")
        print(f"Profile Base Salary: {profile.base_salary} ({type(profile.base_salary)})")
        print(f"Profile Salary Type: {profile.salary_type} ({type(profile.salary_type)})")
        print(f"Profile Work Hours: {profile.work_hours_per_day} ({type(profile.work_hours_per_day)})")
        print(f"Enable TDS: {profile.enable_tds}")

        # LOGIC REPLICATION
        base_salary = float(profile.base_salary or 0.0)
        print(f"Cast Base Salary: {base_salary}")

        records = db.query(Attendance).filter(
            Attendance.user_id == user_id,
            extract('month', Attendance.date) == month,
            extract('year', Attendance.date) == year
        ).all()
        print(f"Attendance Records: {len(records)}")

        present_days = 0.0
        total_overtime_pay = 0.0
        total_bonus = 0.0

        daily_work_hours = float(profile.work_hours_per_day) if profile.work_hours_per_day else 8.0
        print(f"Daily Work Hours: {daily_work_hours}")
        
        hourly_rate = (base_salary / 30) / daily_work_hours
        print(f"Hourly Rate: {hourly_rate}")

        for r in records:
            if r.status == AttendanceStatus.PRESENT:
                present_days += 1.0
            elif r.status == AttendanceStatus.HALF_DAY:
                present_days += 0.5
            
            if r.overtime_hours:
                total_overtime_pay += float(r.overtime_hours) * hourly_rate
            if r.bonus_amount:
                total_bonus += float(r.bonus_amount)
        
        print(f"Present Days (Attendance): {present_days}")
        
        # Holidays
        holidays = db.query(Holiday).filter(
            Holiday.company_id == company_id,
            extract('month', Holiday.date) == month,
            extract('year', Holiday.date) == year
        ).all()
        print(f"Holidays: {len(holidays)}")

        holiday_dates = {h.date for h in holidays}
        attended_dates = {r.date for r in records}
        
        for h_date in holiday_dates:
            if h_date not in attended_dates:
                present_days += 1.0
                
        print(f"Present Days (with Holidays): {present_days}")

        # Off Days
        company = db.query(Company).filter(Company.id == company_id).first()
        off_days = company.off_days if company and company.off_days else []
        print(f"Off Days: {off_days}")
        
        if off_days:
            _, days_in_month_count = monthrange(year, month)
            for day in range(1, days_in_month_count + 1):
                 current_date = date(year, month, day)
                 if current_date.weekday() in off_days:
                     if current_date not in holiday_dates and current_date not in attended_dates:
                         present_days += 1.0
                         
        print(f"Present Days (Final): {present_days}")

        _, days_in_month = monthrange(year, month)
        calculated_amount = 0.0
        
        salary_type_val = profile.salary_type if profile.salary_type else "monthly"
        # If it's an enum, get value
        if hasattr(salary_type_val, 'value'):
             salary_type_val = salary_type_val.value
        
        print(f"Salary Type Value: {salary_type_val}")

        if salary_type_val == "monthly" or salary_type_val == SalaryType.MONTHLY: # Handle both str and enum match attempts
            daily_rate = base_salary / days_in_month
            calculated_amount = daily_rate * present_days
            
        elif salary_type_val == "daily" or salary_type_val == SalaryType.DAILY:
            calculated_amount = base_salary * present_days

        print(f"Calculated Amount: {calculated_amount}")

        # Advances
        advances = db.query(SalaryAdvance).filter(
            SalaryAdvance.user_id == user_id,
            extract('month', SalaryAdvance.date) == month,
            extract('year', SalaryAdvance.date) == year
        ).all()
        
        total_advances = sum([float(a.amount) for a in advances])
        print(f"Total Advances: {total_advances}")

        gross_earnings = calculated_amount + total_overtime_pay + total_bonus
        
        tax_deduction = 0.0
        if profile.enable_tds:
            tds_percentage = float(profile.tds_percentage) if profile.tds_percentage else 0.0
            tax_deduction = (gross_earnings * tds_percentage) / 100
        
        professional_tax = float(profile.professional_tax) if profile.professional_tax else 0.0
        
        final_payable = gross_earnings - total_advances - tax_deduction - professional_tax
        print(f"Final Payable: {final_payable}")
        
        print("SUCCESS! No crash detected.")

    except Exception as e:
        print("\n[CRASH DETECTED]")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_salary(4, 1, 2026)
