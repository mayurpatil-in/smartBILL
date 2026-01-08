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

def init_db():
    print(f"Connecting to {settings.DATABASE_URL}...")
    engine = create_engine(settings.DATABASE_URL)
    
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully!")

if __name__ == "__main__":
    init_db()
