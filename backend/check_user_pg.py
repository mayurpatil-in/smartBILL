from app.database.session import SessionLocal
from app.models.user import User

db = SessionLocal()
user = db.query(User).filter(User.email == "admin@smartbill.com").first()

if user:
    print(f"User found: {user.email}")
    print(f"Role ID: {user.role_id}")
    print(f"Legacy Role: {user.legacy_role}")
    print(f"Is Active: {user.is_active}")
else:
    print("User NOT FOUND!")

db.close()
