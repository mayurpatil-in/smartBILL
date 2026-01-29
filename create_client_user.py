import sys
import os

# Ensure backend directory is in python path
sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "backend", ".env"))

from app.database.init_db import init_db
from app.database.session import SessionLocal
from app.models.client_login import ClientLogin
from app.database.init_db import init_db
from app.database.session import SessionLocal
from app.models.client_login import ClientLogin
from app.models.party import Party
# Import all models to resolve SQLAlchemy relationships
from app.models.company import Company
from app.models.holiday import Holiday
from app.models.user import User
from app.models.role import Role
from app.models.permission import Permission
from app.models.role_permission import RolePermission
from app.models.employee_profile import EmployeeProfile
from app.models.attendance import Attendance
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.item import Item
from app.models.payment import Payment
from app.models.expense import Expense
from app.models.delivery_challan import DeliveryChallan
from app.models.salary_advance import SalaryAdvance
from app.models.audit_log import AuditLog
from app.models.party_challan import PartyChallan
from app.models.party_challan_item import PartyChallanItem
from app.models.payment_allocation import PaymentAllocation
from app.models.process import Process
from app.models.stock_transaction import StockTransaction
from app.models.notification import Notification

from app.core.security import get_password_hash

def create_client_user(party_name_search, username, password):
    db = SessionLocal()
    try:
        # Find Party
        party = db.query(Party).filter(Party.name.ilike(f"%{party_name_search}%")).first()
        if not party:
            print(f"Error: Party matching '{party_name_search}' not found.")
            return

        print(f"Found Party: {party.name} (ID: {party.id})")
        
        # Check if login exists
        existing = db.query(ClientLogin).filter(ClientLogin.party_id == party.id).first()
        if existing:
            print(f"Updating existing login for {party.name}...")
            existing.username = username
            existing.password_hash = get_password_hash(password)
            existing.is_active = True
        else:
            print(f"Creating new login for {party.name}...")
            new_login = ClientLogin(
                party_id=party.id,
                username=username,
                password_hash=get_password_hash(password),
                is_active=True
            )
            db.add(new_login)
        
        db.commit()
        print(f"Success! Login created/updated. Username: {username}, Password: {password}")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python create_client_user.py <party_name_part> <username> <password>")
    else:
        create_client_user(sys.argv[1], sys.argv[2], sys.argv[3])
