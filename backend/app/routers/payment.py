from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import date

from app.database.session import get_db
from app.models.payment import Payment, PaymentType, PaymentMode
from app.models.invoice import Invoice
from app.models.payment_allocation import PaymentAllocation
from app.schemas.payment import PaymentCreate, PaymentUpdate, PaymentResponse
from app.core.dependencies import get_company_id, get_active_financial_year

router = APIRouter(prefix="/payments", tags=["Payments"])

@router.post("/", response_model=PaymentResponse)
def create_payment(
    data: PaymentCreate,
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    payment = Payment(
        company_id=company_id,
        financial_year_id=fy.id,
        party_id=data.party_id,
        payment_date=data.payment_date,
        amount=data.amount,
        payment_type=data.payment_type,
        payment_mode=data.payment_mode,
        reference_number=data.reference_number,
        notes=data.notes
    )
    db.add(payment)
    db.flush() # Get ID

    # Handle Allocations
    for alloc in data.allocations:
        invoice = db.query(Invoice).filter(Invoice.id == alloc.invoice_id).first()
        if invoice:
            # Create Allocation Record
            allocation_record = PaymentAllocation(
                payment_id=payment.id,
                invoice_id=invoice.id,
                amount=alloc.amount
            )
            db.add(allocation_record)
            
            # Update Invoice Stats
            current_paid = float(invoice.paid_amount or 0) + float(alloc.amount)
            invoice.paid_amount = current_paid
            
            if current_paid >= float(invoice.grand_total):
                invoice.payment_status = "PAID"
                invoice.status = "PAID"
            elif current_paid > 0:
                invoice.payment_status = "PARTIAL"
                invoice.status = "PARTIAL"
            else:
                invoice.payment_status = "PENDING"
                # If it was PAID or PARTIAL, revert to BILLED. 
                # Don't touch if it's DRAFT/OPEN and just got a 0 payment (unlikely but safe).
                if invoice.status in ["PAID", "PARTIAL"]: 
                    invoice.status = "BILLED"

    db.commit()
    db.refresh(payment)
    return payment

@router.get("/", response_model=List[PaymentResponse])
def list_payments(
    party_id: Optional[int] = None,
    payment_type: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    query = db.query(Payment).options(
        joinedload(Payment.party),
        joinedload(Payment.allocations).joinedload(PaymentAllocation.invoice)
    ).filter(
        Payment.company_id == company_id,
        Payment.financial_year_id == fy.id
    )
    
    if party_id:
        query = query.filter(Payment.party_id == party_id)
    if payment_type:
        query = query.filter(Payment.payment_type == payment_type)
    if start_date:
        query = query.filter(Payment.payment_date >= start_date)
    if end_date:
        query = query.filter(Payment.payment_date <= end_date)
        
    return query.order_by(Payment.payment_date.desc(), Payment.id.desc()).all()

@router.get("/{id}", response_model=PaymentResponse)
def get_payment(
    id: int,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    payment = db.query(Payment).options(
        joinedload(Payment.allocations).joinedload(PaymentAllocation.invoice)
    ).filter(
        Payment.id == id,
        Payment.company_id == company_id
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment

@router.put("/{id}", response_model=PaymentResponse)
def update_payment(
    id: int,
    data: PaymentUpdate,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    payment = db.query(Payment).filter(
        Payment.id == id,
        Payment.company_id == company_id
    ).first()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
        
    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(payment, key, value)
        
    db.commit()
    db.refresh(payment)
    return payment

@router.delete("/{id}")
def delete_payment(
    id: int,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    payment = db.query(Payment).filter(
        Payment.id == id,
        Payment.company_id == company_id
    ).first()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    # Reverse Allocations
    for alloc in payment.allocations:
        invoice = alloc.invoice
        if invoice:
            current_paid = float(invoice.paid_amount or 0) - float(alloc.amount)
            invoice.paid_amount = max(0, current_paid) # Ensure never negative
            
            if invoice.paid_amount >= float(invoice.grand_total):
                invoice.payment_status = "PAID"
                invoice.status = "PAID"
            elif invoice.paid_amount > 0:
                invoice.payment_status = "PARTIAL"
                invoice.status = "PARTIAL"
            else:
                invoice.payment_status = None 
                invoice.status = "BILLED"

    db.delete(payment)
    db.commit()
    return {"message": "Payment deleted successfully"}
