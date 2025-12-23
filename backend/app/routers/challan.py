from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.delivery_challan import DeliveryChallan
from app.models.delivery_challan_item import DeliveryChallanItem
from app.models.stock_transaction import StockTransaction
from app.schemas.challan import ChallanCreate
from app.core.dependencies import get_company_id, get_active_financial_year
from app.utils.stock import get_current_stock

router = APIRouter(prefix="/challan", tags=["Delivery Challan"])


@router.post("/")
def create_challan(
    data: ChallanCreate,
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    challan = DeliveryChallan(
        company_id=company_id,
        financial_year_id=fy.id,
        party_id=data.party_id
    )

    db.add(challan)
    db.flush()  # get challan.id

    for item in data.items:
        stock = get_current_stock(db, company_id, fy.id, item.item_id)

        if stock < item.quantity:
            raise HTTPException(
                status_code=400,
                detail="Insufficient stock"
            )

        challan_item = DeliveryChallanItem(
            challan_id=challan.id,
            item_id=item.item_id,
            quantity=item.quantity
        )
        db.add(challan_item)

        stock_tx = StockTransaction(
            company_id=company_id,
            financial_year_id=fy.id,
            item_id=item.item_id,
            quantity=item.quantity,
            transaction_type="OUT",
            reference_type="CHALLAN",
            reference_id=challan.id
        )
        db.add(stock_tx)

    db.commit()
    return {"message": "Delivery challan created", "challan_id": challan.id}
