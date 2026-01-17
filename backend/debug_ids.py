from app.database.session import SessionLocal
from app.models.employee_profile import EmployeeProfile
from app.models.user import User
from app.models.role import Role
from app.models.company import Company
from app.models.role_permission import RolePermission
from app.models.permission import Permission
from app.models.attendance import Attendance
from app.models.salary_advance import SalaryAdvance
from sqlalchemy import text, func

def inspect_ids():
    db = SessionLocal()
    try:
        # Inspect logic for Company 11 (from previous output)
        company_id = 11
        
        last_emp_id = db.query(func.max(EmployeeProfile.company_employee_id)).join(User).filter(
            User.company_id == company_id
        ).scalar() or 0
        
        print(f"Calculated Max ID for Company {company_id}: {last_emp_id}")
        print(f"Predicted Next ID: {last_emp_id + 1}")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    inspect_ids()
