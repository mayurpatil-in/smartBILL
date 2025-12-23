from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.stock_transaction import StockTransaction
from app.core.dependencies import get_company_id, get_active_financial_year

router = APIRouter(prefix="/stock", tags=["Stock"])


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
