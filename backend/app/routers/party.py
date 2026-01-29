from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.session import get_db
from app.models.party import Party
from app.models.user import User, UserRole
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.schemas.party import PartyCreate, PartyResponse
from app.core.dependencies import get_company_id, get_active_financial_year, require_role

router = APIRouter(prefix="/party", tags=["Party"])


@router.post("/", response_model=PartyResponse)
def create_party(
    data: PartyCreate,
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)),
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
    db: Session = Depends(get_db)
):
    parties = db.query(Party).filter(
        Party.company_id == company_id
    ).all()
    
    # Calculate current balance for each party
    # This could be optimized with a SQL aggregation query, but for now we loop
    for party in parties:
        # Sum of Invoices (Debit)
        invoice_total = db.query(func.sum(Invoice.grand_total)).filter(
            Invoice.party_id == party.id,
            Invoice.company_id == company_id,
            Invoice.status != "CANCELLED"
        ).scalar() or 0
        
        # Sum of Payments Received (Credit - decreases receivable)
        total_received = db.query(func.sum(Payment.amount)).filter(
            Payment.party_id == party.id,
            Payment.company_id == company_id,
            Payment.payment_type == "RECEIVED"
        ).scalar() or 0
        
        # Sum of Payments Paid (Debit - increases receivable/decreases payable)
        total_paid = db.query(func.sum(Payment.amount)).filter(
            Payment.party_id == party.id,
            Payment.company_id == company_id,
            Payment.payment_type == "PAID"
        ).scalar() or 0
        
        # Calculate Balance
        # Net Balance = Opening + Invoiced - Received + Paid
        party.current_balance = float(party.opening_balance) + float(invoice_total) - float(total_received) + float(total_paid)
        party.total_received = float(total_received)
        
    return parties


@router.put("/{party_id}", response_model=PartyResponse)
def update_party(
    party_id: int,
    data: PartyCreate,
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)),
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    party = db.query(Party).filter(
        Party.id == party_id,
        Party.company_id == company_id
    ).first()

    if not party:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Party not found"
        )

    for key, value in data.dict().items():
        setattr(party, key, value)

    db.commit()
    db.refresh(party)
    return party


@router.delete("/{party_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_party(
    party_id: int,
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)),
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    party = db.query(Party).filter(
        Party.id == party_id,
        Party.company_id == company_id
    ).first()

    if not party:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Party not found"
        )

    db.delete(party)
    db.commit()
