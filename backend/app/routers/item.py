from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database.session import get_db
from app.models.item import Item
from app.models.user import User, UserRole
from app.models.delivery_challan_item import DeliveryChallanItem
from app.models.invoice_item import InvoiceItem
from app.schemas.item import ItemCreate, ItemResponse
from app.core.dependencies import get_company_id, get_active_financial_year, require_role

router = APIRouter(prefix="/item", tags=["Item"])


@router.post("/", response_model=ItemResponse)
def create_item(
    data: ItemCreate,
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)),
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    item = Item(
        company_id=company_id, 
        financial_year_id=fy.id,
        **data.dict()
    )

    db.add(item)
    db.commit()
    db.refresh(item)

    return item


@router.get("/", response_model=list[ItemResponse])
def list_items(
    party_id: int = None,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    query = db.query(Item).options(
        joinedload(Item.process)
    ).filter(
        Item.company_id == company_id
    )
    
    if party_id:
        # Show items for this party OR global items (party_id is NULL)
        # Or typically if filtering by specific party, we might want only that party's items.
        # Requirement: "party wise add item".
        # Let's support filtering by specific party.
        query = query.filter(Item.party_id == party_id)
        
    return query.all()


@router.put("/{item_id}", response_model=ItemResponse)
def update_item(
    item_id: int,
    data: ItemCreate,
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)),
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    item = db.query(Item).filter(
        Item.id == item_id,
        Item.company_id == company_id
    ).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )

    for key, value in data.dict().items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(
    item_id: int,
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)),
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    item = db.query(Item).filter(
        Item.id == item_id,
        Item.company_id == company_id
    ).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )

    # Check if item is used in any delivery challan
    challan_usage = db.query(DeliveryChallanItem).filter(
        DeliveryChallanItem.item_id == item_id
    ).first()

    if challan_usage:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete item '{item.name}': It is used in one or more delivery challans. Please remove it from all challans first."
        )

    # Check if item is used in any invoice
    invoice_usage = db.query(InvoiceItem).filter(
        InvoiceItem.item_id == item_id
    ).first()

    if invoice_usage:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete item '{item.name}': It is used in one or more invoices. Please remove it from all invoices first."
        )

    # If no usage found, safe to delete
    db.delete(item)
    db.commit()
