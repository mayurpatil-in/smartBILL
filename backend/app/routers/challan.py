from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List

from app.database.session import get_db
from app.models.delivery_challan import DeliveryChallan
from app.models.delivery_challan_item import DeliveryChallanItem
from app.models.stock_transaction import StockTransaction
from app.schemas.challan import ChallanCreate, ChallanResponse, ChallanUpdate
from app.core.dependencies import get_company_id, get_active_financial_year
from app.utils.stock import get_current_stock

router = APIRouter(prefix="/challan", tags=["Delivery Challan"])


def generate_challan_number(db: Session, company_id: int, fy_id: int) -> str:
    """Generate next challan number for the company and financial year"""
    last_challan = (
        db.query(DeliveryChallan)
        .filter(
            DeliveryChallan.company_id == company_id,
            DeliveryChallan.financial_year_id == fy_id
        )
        .order_by(DeliveryChallan.id.desc())
        .first()
    )
    
    if last_challan and last_challan.challan_number:
        # Extract number from format like "CH-001"
        try:
            last_num = int(last_challan.challan_number.split("-")[1])
            next_num = last_num + 1
        except:
            next_num = 1
    else:
        next_num = 1
    
    return f"CH-{next_num:03d}"


@router.post("/", response_model=ChallanResponse)
def create_challan(
    data: ChallanCreate,
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    # Generate challan number
    challan_number = generate_challan_number(db, company_id, fy.id)
    
    challan = DeliveryChallan(
        company_id=company_id,
        financial_year_id=fy.id,
        party_id=data.party_id,
        challan_number=challan_number,
        challan_date=data.challan_date,
        notes=data.notes,
        status=data.status or "draft"
    )

    db.add(challan)
    db.flush()  # get challan.id

    for item in data.items:
        stock = get_current_stock(db, company_id, fy.id, item.item_id)

        if stock < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for item {item.item_id}"
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
    db.refresh(challan)
    return challan


@router.get("/", response_model=List[ChallanResponse])
def list_challans(
    party_id: int = None,
    status: str = None,
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    query = db.query(DeliveryChallan).options(
        joinedload(DeliveryChallan.party),
        joinedload(DeliveryChallan.items).joinedload(DeliveryChallanItem.item)
    ).filter(
        DeliveryChallan.company_id == company_id,
        DeliveryChallan.financial_year_id == fy.id
    )
    
    if party_id:
        query = query.filter(DeliveryChallan.party_id == party_id)
    
    if status:
        query = query.filter(DeliveryChallan.status == status)
    
    return query.order_by(DeliveryChallan.challan_date.desc()).all()


@router.get("/{challan_id}", response_model=ChallanResponse)
def get_challan(
    challan_id: int,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    challan = db.query(DeliveryChallan).options(
        joinedload(DeliveryChallan.party),
        joinedload(DeliveryChallan.items).joinedload(DeliveryChallanItem.item)
    ).filter(
        DeliveryChallan.id == challan_id,
        DeliveryChallan.company_id == company_id
    ).first()
    
    if not challan:
        raise HTTPException(status_code=404, detail="Challan not found")
    
    return challan


@router.put("/{challan_id}", response_model=ChallanResponse)
def update_challan(
    challan_id: int,
    data: ChallanUpdate,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    challan = db.query(DeliveryChallan).filter(
        DeliveryChallan.id == challan_id,
        DeliveryChallan.company_id == company_id
    ).first()
    
    if not challan:
        raise HTTPException(status_code=404, detail="Challan not found")
    
    # Update basic fields
    if data.party_id is not None:
        challan.party_id = data.party_id
    if data.challan_date is not None:
        challan.challan_date = data.challan_date
    if data.notes is not None:
        challan.notes = data.notes
    if data.status is not None:
        challan.status = data.status
    if data.is_active is not None:
        challan.is_active = data.is_active
    
    # Update items if provided
    if data.items is not None:
        # Delete existing items and stock transactions
        db.query(DeliveryChallanItem).filter(
            DeliveryChallanItem.challan_id == challan_id
        ).delete()
        
        db.query(StockTransaction).filter(
            StockTransaction.reference_type == "CHALLAN",
            StockTransaction.reference_id == challan_id
        ).delete()
        
        # Add new items
        for item in data.items:
            challan_item = DeliveryChallanItem(
                challan_id=challan.id,
                item_id=item.item_id,
                quantity=item.quantity
            )
            db.add(challan_item)
            
            stock_tx = StockTransaction(
                company_id=company_id,
                financial_year_id=challan.financial_year_id,
                item_id=item.item_id,
                quantity=item.quantity,
                transaction_type="OUT",
                reference_type="CHALLAN",
                reference_id=challan.id
            )
            db.add(stock_tx)
    
    db.commit()
    db.refresh(challan)
    return challan


@router.delete("/{challan_id}")
def delete_challan(
    challan_id: int,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    challan = db.query(DeliveryChallan).filter(
        DeliveryChallan.id == challan_id,
        DeliveryChallan.company_id == company_id
    ).first()
    
    if not challan:
        raise HTTPException(status_code=404, detail="Challan not found")
    
    # Delete stock transactions
    db.query(StockTransaction).filter(
        StockTransaction.reference_type == "CHALLAN",
        StockTransaction.reference_id == challan_id
    ).delete()
    
    # Delete challan items
    db.query(DeliveryChallanItem).filter(
        DeliveryChallanItem.challan_id == challan_id
    ).delete()
    
    # Delete challan
    db.delete(challan)
    db.commit()
    
    return {"message": "Challan deleted successfully"}


@router.get("/next-number/preview")
def get_next_challan_number(
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    """Get the next challan number that will be generated"""
    next_number = generate_challan_number(db, company_id, fy.id)
    return {"next_challan_number": next_number}
