import asyncio
from app.services.backup_service import backup_manager
from app.database.session import SessionLocal, engine
from app.database.base import Base
from app.models.notification import Notification
# Import all models to ensure Registry is populated
from app.models.user import User
from app.models.company import Company
from app.models.attendance import Attendance
from app.models.audit_log import AuditLog
from app.models.delivery_challan import DeliveryChallan
from app.models.delivery_challan_item import DeliveryChallanItem
from app.models.employee_profile import EmployeeProfile
from app.models.expense import Expense
from app.models.financial_year import FinancialYear
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.item import Item
from app.models.party import Party
from app.models.party_challan import PartyChallan
from app.models.party_challan_item import PartyChallanItem
from app.models.payment import Payment
from app.models.payment_allocation import PaymentAllocation
from app.models.process import Process
from app.models.salary_advance import SalaryAdvance
from app.models.stock_transaction import StockTransaction

async def test_notification():
    print("Testing Backup Notification Flow...")

    # Ensure tables exist
    print("Creating tables if needed...")
    Base.metadata.create_all(bind=engine)
    
    # 1. Trigger Manual Backup
    
    # 1. Trigger Manual Backup
    try:
        filename = backup_manager.create_backup(auto=False, format="dump")
        print(f"Backup created: {filename}")
    except Exception as e:
        print(f"Backup Error: {e}")
        return

    # 2. Check Database for Notification
    db = SessionLocal()
    notifs = db.query(Notification).order_by(Notification.created_at.desc()).limit(1).all()
    
    if notifs:
        n = notifs[0]
        print(f"SUCCESS: Notification Found!")
        print(f"Title: {n.title}")
        print(f"Message: {n.message}")
        print(f"Type: {n.type}")
    else:
        print("FAILURE: No notification found in database.")
    
    db.close()

if __name__ == "__main__":
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(test_notification())
