from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.party import Party
from app.schemas.party import PartyCreate, PartyResponse
from app.core.dependencies import get_company_id, get_active_financial_year

router = APIRouter(prefix="/party", tags=["Party"])


@router.post("/", response_model=PartyResponse)
def create_party(
    data: PartyCreate,
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    party = Party(
        company_id=company_id,
        financial_year_id=fy.id,
        **data.dict()
    )

    db.add(party)
    db.commit()
    db.refresh(party)

    return party


@router.get("/", response_model=list[PartyResponse])
def list_parties(
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    return db.query(Party).filter(
        Party.company_id == company_id,
        Party.financial_year_id == fy.id
    ).all()