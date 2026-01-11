# Interactive Script to Create Super Admin
import os
import sys

# Ensure backend directory is in path
sys.path.append(os.getcwd())

# [CRITICAL] Setup Environment via Paths Module
# This ensures we connect to the CORRECT database in AppData
try:
    import app.core.paths
    if "DATABASE_URL" not in os.environ:
         db_url = f"sqlite:///{app.core.paths.DB_PATH.replace(os.sep, '/')}"
         os.environ["DATABASE_URL"] = db_url
         print(f"Using Database: {db_url}")
except ImportError:
    print("Warning: Could not import app.core.paths. Using default environment.")

from app.database.session import SessionLocal
# Import all models to ensure they are registered with SQLAlchemy
from app.models.user import User, UserRole
from app.core.security import get_password_hash
from app.models import * # safe catch-all if __init__ exposes them

def create_super_admin():
    print("====================================")
    print("  CREATE SUPER ADMIN USER (DIRECT)  ")
    print("====================================")
    
    name = input("Enter Name: ").strip()
    email = input("Enter Email: ").strip()
    password = input("Enter Password: ").strip()
    
    if not email or not password:
        print("Error: Email and Password are required.")
        return

    create_user_in_db(name, email, password)

def create_default_super_admin():
    """
    Creates a default super admin if one doesn't exist.
    Credentials: admin@smartbill.com / admin123
    """
    print("Checking for default Super Admin...")
    create_user_in_db("Super Admin", "admin@smartbill.com", "admin123")

def create_user_in_db(name: str, email: str, password: str):
    db = SessionLocal()
    try:
        # Check if user exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            print(f"User with email {email} already exists. Skipping.")
            # Ensure it is active/superuser just in case
            if not existing_user.is_active:
                existing_user.is_active = True
                db.commit()
            return

        # Create User
        print(f"Creating User: {email} with password: {password}")
        hashed = get_password_hash(password)
        
        user = User(
            name=name,
            email=email,
            password_hash=hashed,
            role=UserRole.SUPER_ADMIN,
            is_active=True,
            company_id=None # Super Admin has no specific company
        )
        
        db.add(user)
        db.commit()
        print(f"SUCCESS: Super Admin '{name}' ({email}) created successfully!")
        
    except Exception as e:
        print(f"Error creating super admin: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_super_admin()
