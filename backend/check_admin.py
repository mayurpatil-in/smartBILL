from app.database.session import SessionLocal
from app.models.user import User
from app.core.security import verify_password

db = SessionLocal()
user = db.query(User).filter(User.email == "admin@smartbill.com").first()

if user:
    print(f"User found: YES")
    print(f"Email: {user.email}")
    print(f"Password hash: {user.password_hash}")
    print(f"Password verify (admin123): {verify_password('admin123', user.password_hash)}")
    print(f"Role ID: {user.role_id}")
    print(f"Legacy Role: {user.legacy_role}")
    print(f"Company ID: {user.company_id}")
else:
    print("User NOT found!")

db.close()
