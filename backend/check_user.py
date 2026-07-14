import os
import sys

# Ensure backend directory is in path
sys.path.append(os.getcwd())

# Load environment
from dotenv import load_dotenv
load_dotenv()

from app.database.session import SessionLocal

from app.models.role import Role
from app.models.permission import Permission
from app.models.subscription_plan import SubscriptionPlan
from app.models.company import Company
from app.models.financial_year import FinancialYear
from app.models.party import Party
from app.models.item import Item
from app.models.process import Process
from app.models.role_permission import RolePermission
from app.models.user import User
from app.models.employee_profile import EmployeeProfile
from app.models.party_challan import PartyChallan
from app.models.party_challan_item import PartyChallanItem
from app.models.delivery_challan import DeliveryChallan
from app.models.delivery_challan_item import DeliveryChallanItem
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.payment import Payment
from app.models.payment_allocation import PaymentAllocation
from app.models.expense import Expense
from app.models.stock_transaction import StockTransaction
from app.models.attendance import Attendance
from app.models.salary_advance import SalaryAdvance
from app.models.notification import Notification
from app.models.audit_log import AuditLog
from app.models.holiday import Holiday
from app.models.client_login import ClientLogin
from app.models.pdi_report import PDIReport

from app.core.security import get_password_hash

def fix_user():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "admin@smartbill.com").first()
        if user:
            print("User found!")
            print(f"Legacy Role before: {user.legacy_role}")
            print(f"Is active: {user.is_active}")
            
            # Force reset password and legacy_role
            new_pass = "admin123"
            user.password_hash = get_password_hash(new_pass)
            user.legacy_role = "SUPER_ADMIN"
            user.is_active = True
            
            db.commit()
            print(f"Legacy Role updated to 'SUPER_ADMIN'. Password reset to '{new_pass}' successfully.")
        else:
            print("User admin@smartbill.com NOT FOUND in the database!")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_user()
