import os
import sys

sys.path.append(os.path.join(os.getcwd(), "backend"))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.getcwd(), "backend", ".env"))

from app.database.session import SessionLocal
# Import models in dependency order to avoid sqlalchemy registry errors
from app.models.permission import Permission
from app.models.role import Role
from app.models.role_permission import RolePermission
from app.models.user import User
from app.models.company import Company
from app.models.financial_year import FinancialYear
from app.models.holiday import Holiday
from app.models.process import Process
from app.models.party import Party
from app.models.item import Item
from app.models.party_challan import PartyChallan
from app.models.party_challan_item import PartyChallanItem
from app.models.delivery_challan import DeliveryChallan
from app.models.delivery_challan_item import DeliveryChallanItem
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.expense import Expense
from app.models.employee_profile import EmployeeProfile
from app.models.attendance import Attendance
from app.models.salary_advance import SalaryAdvance
from app.models.payment import Payment
from app.models.payment_allocation import PaymentAllocation
from app.models.stock_transaction import StockTransaction
from app.models.notification import Notification
from app.models.audit_log import AuditLog

if __name__ == "__main__":
    db = SessionLocal()
    try:
        last_challan = db.query(DeliveryChallan).order_by(DeliveryChallan.id.desc()).first()
        if last_challan:
            print(f"LATEST_CHALLAN_ID={last_challan.id}")
        else:
            print("NO_CHALLANS_FOUND")
    finally:
        db.close()
