from app.database.session import SessionLocal
from app.models.employee_profile import EmployeeProfile
from app.models.user import User
from app.models.company import Company
from app.models.role import Role
from app.models.role_permission import RolePermission
from app.models.permission import Permission # <--- Added Permission
from app.models.attendance import Attendance
from app.models.salary_advance import SalaryAdvance
from sqlalchemy import text

def backfill_ids():
    db = SessionLocal()
    try:
        print("Checking for employees without company_employee_id...")
        # Get all profiles
        profiles = db.query(EmployeeProfile).join(User).all()
        
        # Group by company
        company_counters = {} # company_id -> current_max
        
        updates = 0
        for profile in profiles:
            cid = profile.user.company_id
            if not cid: continue # Skip if no company
            
            if cid not in company_counters:
                company_counters[cid] = 0 
            
            if not profile.company_employee_id:
                company_counters[cid] += 1
                profile.company_employee_id = company_counters[cid]
                updates += 1
            else:
                if profile.company_employee_id > company_counters[cid]:
                    company_counters[cid] = profile.company_employee_id

        if updates > 0:
            db.commit()
            print(f"Backfilled {updates} employee IDs.")
        else:
            print("All employees already have IDs.")
            
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    backfill_ids()
