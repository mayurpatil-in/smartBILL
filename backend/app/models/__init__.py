# Import all models here so that a single import of `app.models` registers them all with SQLAlchemy's metadata.
# This prevents "failed to locate a name" errors when SQLAlchemy initializes mappers.

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
from app.models.short_link import ShortLink
from app.models.salary_advance import SalaryAdvance
from app.models.notification import Notification
from app.models.audit_log import AuditLog
from app.models.holiday import Holiday
from app.models.client_login import ClientLogin
from app.models.pdi_report import PDIReport
