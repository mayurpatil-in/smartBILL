from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.item import Item


def get_current_stock(db: Session, company_id: int, fy_id: int, item_id: int):
    item = db.query(Item).filter(Item.id == item_id).first()
    return float(item.current_stock) if item else 0.0
