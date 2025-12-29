from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.stock_transaction import StockTransaction
from app.core.dependencies import get_company_id, get_active_financial_year

router = APIRouter(prefix="/stock", tags=["Stock"])


@router.get("/")
def get_stock(
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    """Get current stock for all items"""
    from app.utils.stock import get_current_stock
    from app.models.item import Item
    
    items = db.query(Item).filter(
        Item.company_id == company_id,
        Item.is_active == True
    ).all()
    
    stock_data = []
    for item in items:
        current_stock = get_current_stock(db, item.id, company_id, fy.id)
        stock_data.append({
            "item_id": item.id,
            "item_name": item.name,
            "current_stock": current_stock
        })
    
    return stock_data


@router.post("/in")
def stock_in(
    item_id: int,
    quantity: float,
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    tx = StockTransaction(
        company_id=company_id,
        financial_year_id=fy.id,
        item_id=item_id,
        quantity=quantity,
        transaction_type="IN",
        reference_type="OPENING"
    )

    db.add(tx)
    db.commit()

    return {"message": "Stock added successfully"}
