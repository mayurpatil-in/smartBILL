import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, joinedload
from app.core.config import settings
from app.models.user import User
from app.models.role import Role
from app.models.company import Company
from app.models.employee_profile import EmployeeProfile
from app.models.attendance import Attendance
from app.models.salary_advance import SalaryAdvance
from app.models.role_permission import RolePermission
from app.models.permission import Permission
from app.schemas.user import UserResponse
from pydantic import ValidationError

def debug_schema():
    print("Connecting to DB...")
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    print("Fetching users...")
    # Fetch all users to be exhaustive
    users = db.query(User).options(
        joinedload(User.employee_profile),
        joinedload(User.role)
    ).all()
    
    print(f"Found {len(users)} users. Validating against UserResponse schema...")
    
    failure_count = 0
    for user in users:
        try:
            # Attempt validation
            UserResponse.model_validate(user)
            # print(f"User {user.id} ({user.name}): OK")
        except ValidationError as e:
            failure_count += 1
            print(f"\n[CRITICAL FAILURE] User {user.id} ({user.name}) failed validation!")
            print(f"Role: {user.role.name if user.role else 'None'}")
            print(f"Legacy Role: {user.legacy_role}")
            print(f"Profile: {user.employee_profile}")
            print("Errors:")
            for error in e.errors():
                print(f" - {error['loc']} -> {error['msg']}")
        except Exception as e:
            failure_count += 1
            print(f"\n[CRITICAL FAILURE] User {user.id} ({user.name}) threw unexpected error: {e}")

    if failure_count == 0:
        print("\nAll users passed validation! The issue might be elsewhere (e.g. infinite recursion, timeouts).")
    else:
        print(f"\nFound {failure_count} validation failures.")

if __name__ == "__main__":
    debug_schema()
