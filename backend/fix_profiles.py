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

def fix_missing_profiles():
    db = SessionLocal()
    try:
        print("Checking for Employees missing EmployeeProfile...")
        
        # Get all users with role 'Employee'
        employees = db.query(User).join(Role).filter(Role.name == "Employee").all()
        
        # Counters for company IDs
        # First, initialize counters with existing max IDs from profiles
        company_counters = {} 
        existing_profiles = db.query(
            User.company_id, 
            func.max(EmployeeProfile.company_employee_id)
        ).join(User).group_by(User.company_id).all()
        
        for cid, max_id in existing_profiles:
            if cid:
                company_counters[cid] = max_id or 0
        
        created_count = 0
        for user in employees:
            if not user.company_id: continue 
            
            # Check if profile exists
            if not user.employee_profile:
                print(f"User {user.name} (ID {user.id}) missing profile. Creating...")
                
                # Get next ID
                if user.company_id not in company_counters:
                    company_counters[user.company_id] = 0
                
                company_counters[user.company_id] += 1
                new_id = company_counters[user.company_id]
                
                profile = EmployeeProfile(
                    user_id=user.id,
                    company_employee_id=new_id
                )
                db.add(profile)
                created_count += 1
        
        if created_count > 0:
            db.commit()
            print(f"Created {created_count} missing profiles.")
        else:
            print("No missing profiles found.")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_missing_profiles()
