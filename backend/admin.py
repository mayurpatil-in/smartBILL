# admin.py
from app.database.session import SessionLocal

# 🔴 IMPORTANT: import BOTH models
from app.models.user import User
from app.models.company import Company  # ✅ REQUIRED
from app.core.security import get_password_hash

db = SessionLocal()

user = db.query(User).filter(
    User.email == "superadmin@smartbill.com"
).first()

user.password_hash = get_password_hash("admin123")
db.commit()

db.close()

print("✅ Super Admin password reset successfully")
