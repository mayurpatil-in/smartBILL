from app.database.session import engine
from app.database.base import Base

# core
from app.models.company import Company
from app.models.user import User
from app.models.financial_year import FinancialYear

# masters
from app.models.party import Party
from app.models.item import Item

# stock & challan
from app.models.stock_transaction import StockTransaction
from app.models.delivery_challan import DeliveryChallan
from app.models.delivery_challan_item import DeliveryChallanItem

# 🔥 INVOICE (THIS WAS MISSING)
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem


def init_db():
    Base.metadata.create_all(bind=engine)
