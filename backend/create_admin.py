from app.database.session import SessionLocal
from app.models.company import Company
from app.models.user import User
from app.core.security import hash_password

db = SessionLocal()

company = Company(name="Demo Company")
db.add(company)
db.commit()
db.refresh(company)

admin = User(
    company_id=company.id,
    name="Admin",
    email="admin@demo.com",
    password_hash=hash_password("admin123"),
    role="COMPANY_ADMIN"
)

db.add(admin)
db.commit()
db.close()
