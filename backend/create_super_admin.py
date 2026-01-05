# Interactive Script to Create Super Admin
import os
import sys

# Ensure backend directory is in path
sys.path.append(os.getcwd())

from app.database.session import SessionLocal
# Import all models to ensure they are registered with SQLAlchemy
from app.models.user import User, UserRole
from app.models.company import Company
from app.models.financial_year import FinancialYear
from app.models.party import Party
from app.models.party_challan import PartyChallan
from app.models.party_challan_item import PartyChallanItem
from app.models.delivery_challan import DeliveryChallan
from app.models.delivery_challan_item import DeliveryChallanItem
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.item import Item
from app.models.stock_transaction import StockTransaction
from app.models import * # safe catch-all if __init__ exposes them

from app.core.security import get_password_hash

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

    db = SessionLocal()
    try:
        # Check if user exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            print(f"Error: User with email {email} already exists.")
            return

        # Create User
        user = User(
            name=name,
            email=email,
            password_hash=get_password_hash(password),
            role=UserRole.SUPER_ADMIN,
            is_active=True,
            company_id=None # Super Admin has no specific company
        )
        
        db.add(user)
        db.commit()
        print(f"\nSUCCESS: Super Admin '{name}' created successfully!")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_super_admin()
