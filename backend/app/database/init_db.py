from sqlalchemy import create_engine
from app.core.config import settings
from app.database.base import Base

# Import ALL models so Base knows about them
from app.models.company import Company
from app.models.financial_year import FinancialYear
from app.models.user import User
from app.models.party import Party
from app.models.item import Item
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.delivery_challan import DeliveryChallan
from app.models.process import Process
from app.models.party_challan import PartyChallan
from app.models.employee_profile import EmployeeProfile
from app.models.attendance import Attendance
from app.models.notification import Notification
from app.models.client_login import ClientLogin

def init_db():
    print(f"Connecting to {settings.DATABASE_URL}...")
    engine = create_engine(settings.DATABASE_URL)
    
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully!")

    # --- SEED DEFAULT SUPER ADMIN ---
    try:
        from sqlalchemy.orm import sessionmaker
        from app.core.security import get_password_hash
        
        SessionLocal = sessionmaker(bind=engine)
        db = SessionLocal()
        
        user = db.query(User).filter(User.email == "admin@smartbill.com").first()
        if not user:
            print("Seeding default Super Admin user...")
            super_admin = User(
                name="Super Admin",
                email="admin@smartbill.com",
                password_hash=get_password_hash("admin"),
                legacy_role="SUPER_ADMIN",
                # Fetch role_id separately or let the seeder handle it
                # For safety, we set role to None and let fix_user_roles.py handle it, 
                # OR better: fetch the role here if it exists.
                is_active=True,
            )
            db.add(super_admin)
            db.commit()
            print("Default Super Admin created: admin@smartbill.com / admin")
        else:
             print("Super Admin already exists.")
        
        db.close()
    except Exception as e:
        print(f"Error seeding default user: {e}")

if __name__ == "__main__":
    init_db()
