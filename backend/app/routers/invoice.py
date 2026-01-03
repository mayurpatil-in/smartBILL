from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from typing import List, Optional
from datetime import date
import io
import base64
import qrcode
import socket
import os
from num2words import num2words

from fastapi.responses import Response
from jinja2 import Environment, FileSystemLoader

from app.database.session import get_db
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.delivery_challan import DeliveryChallan
from app.models.delivery_challan_item import DeliveryChallanItem
from app.models.stock_transaction import StockTransaction
from app.models.company import Company
from app.models.party import Party

from app.schemas.invoice import InvoiceResponse, InvoiceCreate
from app.core.dependencies import get_company_id, get_active_financial_year
from app.core.security import create_url_signature, verify_url_signature
from app.utils.gst import calculate_gst
from app.services.pdf_service import generate_pdf

router = APIRouter(prefix="/invoice", tags=["Invoice"])

# Setup Jinja2
templates_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
env = Environment(loader=FileSystemLoader(templates_dir))


def generate_invoice_number(db: Session, company_id: int, fy_id: int) -> str:
    """Generate next invoice number (e.g. 24-25/001) for the company and FY"""
    # 1. Get FY Short Name (e.g. 24-25)
    from app.models.financial_year import FinancialYear
    fy = db.query(FinancialYear).filter(FinancialYear.id == fy_id).first()
    if not fy:
        # Fallback if no FY found (shouldn't happen)
        return "INV-001"
        
    start_yy = fy.start_date.strftime("%y")
    end_yy = fy.end_date.strftime("%y")
    fy_prefix = f"{start_yy}-{end_yy}" # e.g. "24-25"

    last_invoice = (
        db.query(Invoice)
        .filter(
            Invoice.company_id == company_id,
            Invoice.financial_year_id == fy_id
        )
        .order_by(Invoice.id.desc())
        .first()
    )
    
    if last_invoice and last_invoice.invoice_number:
        try:
            # Expected format "INV/24-25/001"
            if "/" in last_invoice.invoice_number:
                parts = last_invoice.invoice_number.split("/")
                last_num = int(parts[-1])
                next_num = last_num + 1
            else:
                # Handle migration from old format INV-001
                next_num = 1 
        except:
            next_num = 1
    else:
        next_num = 1
        
    return f"INV/{fy_prefix}/{next_num:03d}"


@router.get("/next-number")
def get_next_invoice_number(
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    next_num = generate_invoice_number(db, company_id, fy.id)
    return {"next_invoice_number": next_num}


@router.get("/stats")
def get_invoice_stats(
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    stats = {
        "total": {"count": 0, "amount": 0},
        "paid": {"count": 0, "amount": 0},
        "pending": {"count": 0, "amount": 0}
    }
    
    invoices = db.query(Invoice).filter(
        Invoice.company_id == company_id,
        Invoice.financial_year_id == fy.id
    ).all()
    
    for inv in invoices:
        # Total
        stats["total"]["count"] += 1
        stats["total"]["amount"] += float(inv.grand_total or 0)
        
        # Paid vs Pending
        if inv.status == "PAID":
            stats["paid"]["count"] += 1
            stats["paid"]["amount"] += float(inv.grand_total or 0)
        else:
            stats["pending"]["count"] += 1
            stats["pending"]["amount"] += float(inv.grand_total or 0)
            
    return stats


@router.get("/stats")
def get_invoice_stats(
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    stats = {
        "total": {"count": 0, "amount": 0},
        "paid": {"count": 0, "amount": 0},
        "pending": {"count": 0, "amount": 0}
    }
    
    invoices = db.query(Invoice).filter(
        Invoice.company_id == company_id,
        Invoice.financial_year_id == fy.id
    ).all()
    
    for inv in invoices:
        # Total
        stats["total"]["count"] += 1
        stats["total"]["amount"] += float(inv.grand_total or 0)
        
        # Paid vs Pending
        if inv.status == "PAID":
            stats["paid"]["count"] += 1
            stats["paid"]["amount"] += float(inv.grand_total or 0)
        else:
            stats["pending"]["count"] += 1
            stats["pending"]["amount"] += float(inv.grand_total or 0)
            
    return stats


    return stats


@router.get("/pending", response_model=List[InvoiceResponse])
def get_pending_invoices(
    party_id: Optional[int] = None,
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    query = db.query(Invoice).filter(
        Invoice.company_id == company_id,
        Invoice.status != "CANCELLED",
        or_(Invoice.payment_status != "PAID", Invoice.payment_status == None)
    )
    
    if party_id:
        query = query.filter(Invoice.party_id == party_id)
        
    return query.order_by(Invoice.invoice_date.asc()).all()


@router.post("/", response_model=InvoiceResponse)
def create_invoice(
    data: InvoiceCreate,
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    """Create a direct invoice (not from challan)"""
    invoice_number = generate_invoice_number(db, company_id, fy.id)
    
    subtotal = 0
    invoice = Invoice(
        company_id=company_id,
        financial_year_id=fy.id,
        party_id=data.party_id,
        invoice_number=invoice_number,
        invoice_date=data.invoice_date,
        due_date=data.due_date,
        notes=data.notes,
        status="OPEN",
        is_locked=False
    )
    
    db.add(invoice)
    db.flush()
    
    for item in data.items:
        amount = float(item.quantity) * float(item.rate)
        subtotal += amount
        
        invoice_item = InvoiceItem(
            invoice_id=invoice.id,
            item_id=item.item_id,
            grn_no=item.grn_no,
            delivery_challan_item_id=item.delivery_challan_item_id,
            quantity=item.quantity,
            rate=item.rate,
            amount=amount
        )
        db.add(invoice_item)
        
        # Stock Transaction (OUT) for Direct Invoice (Only if not from Challan)
        if not item.delivery_challan_item_id:
            stock_tx = StockTransaction(
                company_id=company_id,
                financial_year_id=fy.id,
                item_id=item.item_id,
                quantity=item.quantity,
                transaction_type="OUT",
                reference_type="INVOICE",
                reference_id=invoice.id
            )
            db.add(stock_tx)
        
    gst_amount, grand_total = calculate_gst(subtotal)
    
    invoice.subtotal = subtotal
    invoice.gst_amount = gst_amount
    invoice.grand_total = grand_total
    
    # Update linked Delivery Challan Status
    challan_item_ids = [item.delivery_challan_item_id for item in data.items if item.delivery_challan_item_id]
    if challan_item_ids:
        # Find Challan IDs using subquery strategy to avoid join issues
        challan_ids = db.query(DeliveryChallan.id).join(DeliveryChallanItem).filter(
            DeliveryChallanItem.id.in_(challan_item_ids)
        ).distinct().all()
        ids = [c[0] for c in challan_ids]
        
        if ids:
            db.query(DeliveryChallan).filter(
                DeliveryChallan.id.in_(ids)
            ).update({DeliveryChallan.status: "delivered"}, synchronize_session=False)
    
    db.commit()
    db.refresh(invoice)
    return invoice


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: int,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    invoice = (
        db.query(Invoice)
        .options(
            joinedload(Invoice.party),
            joinedload(Invoice.items).joinedload(InvoiceItem.item),
            joinedload(Invoice.items).joinedload(InvoiceItem.delivery_challan_item).joinedload(DeliveryChallanItem.challan)
        )
        .filter(
            Invoice.id == invoice_id,
            Invoice.company_id == company_id
        )
        .first()
    )

    if not invoice:
        raise HTTPException(404, "Invoice not found")
        
    return invoice


@router.put("/{invoice_id}", response_model=InvoiceResponse)
def update_invoice(
    invoice_id: int,
    data: InvoiceCreate,
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.company_id == company_id
    ).first()

    if not invoice:
        raise HTTPException(404, "Invoice not found")

    if invoice.is_locked:
        raise HTTPException(400, "Cannot edit locked invoice")

    # 1. Revert Stock for Old Items
    old_items = db.query(InvoiceItem).filter(InvoiceItem.invoice_id == invoice.id).all()
    for item in old_items:
        # Revert Stock (IN) - Only if it was a Direct Invoice item (not from Challan)
        if not item.delivery_challan_item_id:
            stock_tx = StockTransaction(
                company_id=company_id,
                financial_year_id=fy.id,
                item_id=item.item_id,
                quantity=item.quantity,
                transaction_type="IN", # Reverse the OUT
                reference_type="INV_UPD_REVERT",
                reference_id=invoice.id
            )
            db.add(stock_tx)

    # 1.5 Revert Linked Challan Status to "sent" (Release them first)
    old_challan_item_ids = [item.delivery_challan_item_id for item in old_items if item.delivery_challan_item_id]
    if old_challan_item_ids:
        # Find unique Challan IDs
        old_challan_ids_tuples = db.query(DeliveryChallan.id).join(DeliveryChallanItem).filter(
            DeliveryChallanItem.id.in_(old_challan_item_ids)
        ).distinct().all()
        
        old_challan_ids = [c[0] for c in old_challan_ids_tuples]
        
        if old_challan_ids:
             db.query(DeliveryChallan).filter(
                DeliveryChallan.id.in_(old_challan_ids)
            ).update({DeliveryChallan.status: "sent"}, synchronize_session=False)

    # 2. Delete Old Items
    db.query(InvoiceItem).filter(InvoiceItem.invoice_id == invoice.id).delete()

    # 3. Update Invoice Details
    invoice.party_id = data.party_id
    invoice.invoice_date = data.invoice_date
    invoice.due_date = data.due_date
    invoice.notes = data.notes

    # 4. Add New Items
    subtotal = 0
    for item in data.items:
        amount = float(item.quantity) * float(item.rate)
        subtotal += amount
        
        invoice_item = InvoiceItem(
            invoice_id=invoice.id,
            item_id=item.item_id,
            grn_no=item.grn_no,
            delivery_challan_item_id=item.delivery_challan_item_id,
            quantity=item.quantity,
            rate=item.rate,
            amount=amount
        )
        db.add(invoice_item)
        
        # New Stock Transaction (OUT) - Only if not from Challan
        if not item.delivery_challan_item_id:
            stock_tx = StockTransaction(
                company_id=company_id,
                financial_year_id=fy.id,
                item_id=item.item_id,
                quantity=item.quantity,
                transaction_type="OUT",
                reference_type="INVOICE",
                reference_id=invoice.id
            )
            db.add(stock_tx)

    # 5. Recalculate Totals
    gst_amount, grand_total = calculate_gst(subtotal)
    
    invoice.subtotal = subtotal
    invoice.gst_amount = gst_amount
    invoice.grand_total = grand_total
    
    # Update linked Delivery Challan Status
    challan_item_ids = [item.delivery_challan_item_id for item in data.items if item.delivery_challan_item_id]
    if challan_item_ids:
        # Find Challan IDs using subquery strategy
        challan_ids = db.query(DeliveryChallan.id).join(DeliveryChallanItem).filter(
            DeliveryChallanItem.id.in_(challan_item_ids)
        ).distinct().all()
        ids = [c[0] for c in challan_ids]
        
        if ids:
            db.query(DeliveryChallan).filter(
                DeliveryChallan.id.in_(ids)
            ).update({DeliveryChallan.status: "delivered"}, synchronize_session=False)
            
    db.commit()
    db.refresh(invoice)
    return invoice


@router.delete("/{invoice_id}")
def delete_invoice(
    invoice_id: int,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.company_id == company_id
    ).first()

    if not invoice:
        raise HTTPException(404, "Invoice not found")

    if invoice.is_locked:
        raise HTTPException(400, "Cannot delete locked invoice")

    # 1. Delete Stock Transactions (Restore Stock)
    # Deleting the 'OUT' transaction effectively restores the stock.
    # We should delete ALL transactions referenced by this invoice (OUT and potentially future INs/Reverts if any exist from updates)
    db.query(StockTransaction).filter(
        StockTransaction.reference_type.in_(["INVOICE", "INVOICE_UPDATE_REVERT"]),
        StockTransaction.reference_id == invoice.id
    ).delete(synchronize_session=False)

    # Revert linked Delivery Challan Status to "sent"
    invoice_items = db.query(InvoiceItem).filter(InvoiceItem.invoice_id == invoice.id).all()
    challan_item_ids = [item.delivery_challan_item_id for item in invoice_items if item.delivery_challan_item_id]
    
    if challan_item_ids:
        challans = db.query(DeliveryChallan).join(DeliveryChallanItem).filter(
            DeliveryChallanItem.id.in_(challan_item_ids)
        ).distinct().all()
        for challan in challans:
            challan.status = "sent"
            db.add(challan)

    # 2. Delete Invoice Items
    db.query(InvoiceItem).filter(InvoiceItem.invoice_id == invoice.id).delete()

    # 3. Delete Invoice
    db.delete(invoice)
    db.commit()
    
    return {"message": "Invoice deleted", "reverted_challans": len(challan_item_ids)}





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

    invoice_number = generate_invoice_number(db, company_id, fy.id)

    subtotal = 0
    invoice = Invoice(
        company_id=company_id,
        financial_year_id=fy.id,
        party_id=challan.party_id,
        challan_id=challan.id,
        invoice_number=invoice_number,
        status="OPEN"
    )

    db.add(invoice)
    db.flush()

    for item in challan.items:
        amount = float(item.quantity) * float(item.item.rate)
        subtotal += amount

        invoice_item = InvoiceItem(
            invoice_id=invoice.id,
            item_id=item.item_id,
            delivery_challan_item_id=item.id, # Link to source challan item
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


@router.get("/", response_model=List[InvoiceResponse])
def list_invoices(
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    invoices = (
        db.query(Invoice)
        .options(
            joinedload(Invoice.party),
            joinedload(Invoice.items).joinedload(InvoiceItem.item)
        )
        .filter(
            Invoice.company_id == company_id,
            Invoice.financial_year_id == fy.id
        )
        .order_by(Invoice.id.desc())
        .all()
    )
    return invoices


def format_inr(number):
    try:
        s, *d = str("{:.2f}".format(float(number))).partition(".")
        r = ",".join([s[x-2:x] for x in range(-3, -len(s), -2)][::-1] + [s[-3:]])
        return "".join([r] + d) if r else d[0]
    except:
        return str(number)

@router.get("/{invoice_id}/print")
async def print_invoice(
    invoice_id: int,
    request: Request,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    print(f"DEBUG: Requesting PDF for Invoice {invoice_id}")
    invoice = db.query(Invoice).options(
        joinedload(Invoice.party),
        joinedload(Invoice.challan),
        joinedload(Invoice.items).joinedload(InvoiceItem.item),
        joinedload(Invoice.items).joinedload(InvoiceItem.delivery_challan_item)
    ).filter(
        Invoice.id == invoice_id,
        Invoice.company_id == company_id
    ).first()
    
    if not invoice:
        raise HTTPException(404, "Invoice not found")
        
    company = db.query(Company).filter(Company.id == company_id).first()
    
    # Generate QR Code for Public Download
    base_url = str(request.base_url)
    # Localhost Fix
    if "localhost" in base_url or "127.0.0.1" in base_url:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            lan_ip = s.getsockname()[0]
            s.close()
            base_url = base_url.replace("localhost", lan_ip).replace("127.0.0.1", lan_ip)
        except:
            pass
            
    signature = create_url_signature(str(invoice_id))
    download_url = f"{base_url}public/invoice/{invoice_id}/download?token={signature}"
    
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(download_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    qr_code_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
    
    # Calculate words
    try:
        grand_total_words = num2words(invoice.grand_total, lang='en_IN').title().replace(",", "") + " Only"
    except:
        grand_total_words = f"{invoice.grand_total} Only"

    # Render
    template = env.get_template("invoice.html")
    html = template.render(
        invoice=invoice,
        company=company,
        party=invoice.party,
        items=invoice.items,
        qr_code=qr_code_b64,
        grand_total_words=grand_total_words,
        format_currency=format_inr
    )
    
    pdf_content = await generate_pdf(html)
    
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={invoice.invoice_number}.pdf"}
    )


# Public Router for Invoices
public_router = APIRouter(prefix="/public/invoice", tags=["Public Invoice"])

@public_router.get("/{invoice_id}/download")
async def public_download_invoice(
    invoice_id: int,
    token: str,
    db: Session = Depends(get_db)
):
    if not verify_url_signature(str(invoice_id), token):
        raise HTTPException(403, "Invalid link")
        
    invoice = db.query(Invoice).options(
        joinedload(Invoice.party),
        joinedload(Invoice.items).joinedload(InvoiceItem.item)
    ).filter(Invoice.id == invoice_id).first()
    
    if not invoice:
        raise HTTPException(404, "Invoice not found")
        
    company = db.query(Company).filter(Company.id == invoice.company_id).first()
    
    # Re-generate QR (could abstract this)
    # For now, simplistic QR or same link
    qr_data = f"Invoice: {invoice.invoice_number}\nDate: {invoice.invoice_date}\nAmount: {invoice.grand_total}"
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(qr_data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    qr_code_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
    
    # Calculate words
    try:
        grand_total_words = num2words(invoice.grand_total, lang='en_IN').title().replace(",", "") + " Only"
    except:
        grand_total_words = f"{invoice.grand_total} Only"

    template = env.get_template("invoice.html")
    html = template.render(
        invoice=invoice,
        company=company,
        party=invoice.party,
        items=invoice.items,
        qr_code=qr_code_b64,
        grand_total_words=grand_total_words,
        format_currency=format_inr
    )
    
    pdf_content = await generate_pdf(html)
    
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={invoice.invoice_number}.pdf"}
    )
