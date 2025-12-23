from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.stock_transaction import StockTransaction


def get_current_stock(db: Session, company_id: int, fy_id: int, item_id: int):
    in_qty = db.query(func.coalesce(func.sum(StockTransaction.quantity), 0)).filter(
        StockTransaction.company_id == company_id,
        StockTransaction.financial_year_id == fy_id,
        StockTransaction.item_id == item_id,
        StockTransaction.transaction_type == "IN"
    ).scalar()

    out_qty = db.query(func.coalesce(func.sum(StockTransaction.quantity), 0)).filter(
        StockTransaction.company_id == company_id,
        StockTransaction.financial_year_id == fy_id,
        StockTransaction.item_id == item_id,
        StockTransaction.transaction_type == "OUT"
    ).scalar()

    return float(in_qty - out_qty)
