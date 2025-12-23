from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.delivery_challan import DeliveryChallan
from app.schemas.invoice import InvoiceResponse 
from app.core.dependencies import get_company_id, get_active_financial_year
from app.utils.gst import calculate_gst

router = APIRouter(prefix="/invoice", tags=["Invoice"])


@router.post("/from-challan/{challan_id}", response_model=InvoiceResponse)
def create_invoice_from_challan(
    challan_id: int,
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    challan = db.query(DeliveryChallan).filter(
        DeliveryChallan.id == challan_id,
        DeliveryChallan.company_id == company_id,
        DeliveryChallan.status == "OPEN"
    ).first()

    if not challan:
        raise HTTPException(404, "Challan not found or already billed")

    subtotal = 0
    invoice = Invoice(
        company_id=company_id,
        financial_year_id=fy.id,
        party_id=challan.party_id,
        challan_id=challan.id
    )

    db.add(invoice)
    db.flush()

    for item in challan.items:
        amount = float(item.quantity) * float(item.item.rate)
        subtotal += amount

        invoice_item = InvoiceItem(
            invoice_id=invoice.id,
            item_id=item.item_id,
            quantity=item.quantity,
            rate=item.item.rate,
            amount=amount
        )
        db.add(invoice_item)

    gst_amount, grand_total = calculate_gst(subtotal)

    invoice.subtotal = subtotal
    invoice.gst_amount = gst_amount
    invoice.grand_total = grand_total

    challan.status = "BILLED"

    db.commit()
    db.refresh(invoice)

    return invoice
