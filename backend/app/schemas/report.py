from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import date

class ExpenseBreakdownItem(BaseModel):
    category: str
    amount: float

class AutoCashFlowItem(BaseModel):
    month: str
    income: float
    expense: float
    net: float

class DashboardStats(BaseModel):
    revenue: float
    receivables: float
    expenses: float
    net_income: float
    sales_trend: List[Any] # Keeping it flexible for now or specific if needed
    recent_activity: List[Any]
    expense_breakdown: List[ExpenseBreakdownItem] = []
    monthly_cashflow: List[AutoCashFlowItem] = []

# Analytics Schemas
class TopCustomer(BaseModel):
    party_id: int
    party_name: str
    total_revenue: float
    invoice_count: int
    avg_invoice_value: float
    last_invoice_date: Optional[date]
    revenue_percentage: float

class AgingBucket(BaseModel):
    bucket: str
    count: int
    amount: float
    percentage: float

class OverdueInvoicesSummary(BaseModel):
    total_overdue: float
    total_count: int
    aging_buckets: List[AgingBucket]

class CashFlowProjection(BaseModel):
    current_cash: float
    period_30_days: dict
    period_60_days: dict
    period_90_days: dict
    cash_runway_days: Optional[int]

class ProductPerformance(BaseModel):
    item_id: int
    item_name: str
    total_quantity_sold: float
    total_revenue: float
    avg_selling_price: float
    revenue_percentage: float

class CollectionMetrics(BaseModel):
    days_sales_outstanding: float
    collection_effectiveness_index: float
    avg_payment_delay_days: float
    target_dso: float
    target_cei: float
