from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database.session import get_db
from app.models.item import Item
from app.schemas.item import ItemCreate, ItemResponse
from app.core.dependencies import get_company_id, get_active_financial_year

router = APIRouter(prefix="/item", tags=["Item"])


@router.post("/", response_model=ItemResponse)
def create_item(
    data: ItemCreate,
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

    db.delete(item)
    db.commit()
