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
