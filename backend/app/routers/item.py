from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.item import Item
from app.schemas.item import ItemCreate, ItemResponse
from app.core.dependencies import get_company_id

router = APIRouter(prefix="/item", tags=["Item"])


@router.post("/", response_model=ItemResponse)
def create_item(
    data: ItemCreate,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    item = Item(company_id=company_id, **data.dict())

    db.add(item)
    db.commit()
    db.refresh(item)

    return item


@router.get("/", response_model=list[ItemResponse])
def list_items(
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    return db.query(Item).filter(
        Item.company_id == company_id
    ).all()
