from app.database.session import SessionLocal
from app.models.employee_profile import EmployeeProfile
from app.models.user import User
from app.models.role import Role
from app.models.company import Company
from app.models.role_permission import RolePermission
from app.models.permission import Permission
from app.models.attendance import Attendance
from app.models.salary_advance import SalaryAdvance
from sqlalchemy import text

def resequence_ids():
    db = SessionLocal()
    try:
        print("Resequencing Employee IDs for all companies...")
        
        # Get distinct companies
        companies = db.query(User.company_id).distinct().all()
        
        total_updates = 0
        
        for (cid,) in companies:
            if not cid: continue
            
            # Get all employees for this company, ordered by creation time (User.id)
            employees = db.query(EmployeeProfile).join(User).filter(
                User.company_id == cid
            ).order_by(User.id).all()
            
            print(f"Company {cid}: Processing {len(employees)} employees...")
            
            current_id = 1
            for profile in employees:
                if profile.company_employee_id != current_id:
                    print(f"  - Renumbering {profile.user.name} (User {profile.user_id}): {profile.company_employee_id} -> {current_id}")
                    profile.company_employee_id = current_id
                    total_updates += 1
                current_id += 1
                
        if total_updates > 0:
            db.commit()
            print(f"Successfully resequenced {total_updates} employees.")
        else:
            print("All employees are already sequential.")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    resequence_ids()
