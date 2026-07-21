from fastapi import APIRouter, Depends, HTTPException, Request, Query
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
from pydantic import BaseModel

from fastapi.responses import Response
from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.database.session import get_db
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.delivery_challan import DeliveryChallan
from app.models.delivery_challan_item import DeliveryChallanItem
from app.models.stock_transaction import StockTransaction
from app.models.company import Company
from app.models.party import Party
import os
from app.models.user import User, UserRole

from app.schemas.invoice import InvoiceResponse, InvoiceCreate
from app.core.dependencies import get_company_id, get_active_financial_year, require_role, require_feature, get_current_user
from app.core.permissions import require_permission
from app.core.security import create_url_signature, verify_url_signature
from app.utils.gst import calculate_gst
from app.services.pdf_service import generate_pdf

router = APIRouter(prefix="/invoice", tags=["Invoice"])

# Setup Jinja2
templates_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
env = Environment(
    loader=FileSystemLoader(templates_dir),
    autoescape=select_autoescape(['html', 'xml'])
)


def generate_invoice_number(db: Session, company_id: int, fy_id: int) -> str:
    """Generate next invoice number (e.g. INV/24-25/001) for the company and FY.
    
    Uses SELECT FOR UPDATE to lock the last invoice row, preventing race conditions
    when two users create invoices simultaneously on multi-worker deployments.
    """
    # 1. Get FY Short Name (e.g. 24-25)
    from app.models.financial_year import FinancialYear
    fy = db.query(FinancialYear).filter(FinancialYear.id == fy_id).first()
    if not fy:
        # Fallback if no FY found (shouldn't happen)
        return "INV-001"
        
    start_yy = fy.start_date.strftime("%y")
    end_yy = fy.end_date.strftime("%y")
    fy_prefix = f"{start_yy}-{end_yy}" # e.g. "24-25"

    # [FIX] SELECT FOR UPDATE: Locks the last invoice row until this transaction
    # commits. If two requests hit simultaneously, the second one WAITS here
    # instead of reading stale data — eliminating the duplicate number race condition.
    last_invoice = (
        db.query(Invoice)
        .filter(
            Invoice.company_id == company_id,
            Invoice.financial_year_id == fy_id
        )
        .order_by(Invoice.id.desc())
        .with_for_update()   # ← DB-level lock: prevents concurrent reads
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
        except (ValueError, IndexError):
            next_num = 1
    else:
        next_num = 1
        
    # Safety loop: skip any number already taken (e.g. manually entered invoices)
    while True:
        next_invoice_num = f"INV/{fy_prefix}/{next_num:03d}"
        exists = db.query(Invoice).filter(
            Invoice.invoice_number == next_invoice_num
        ).first()
        
        if not exists:
            return next_invoice_num
            
        next_num += 1


@router.get("/next-number")
@require_permission("invoices.view")
def get_next_invoice_number(
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    next_num = generate_invoice_number(db, company_id, fy.id)
    return {"next_invoice_number": next_num}


@router.get("/stats")
@require_permission("invoices.view")
def get_invoice_stats(
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
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
@require_permission("invoices.view")
def get_pending_invoices(
    party_id: Optional[int] = None,
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
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
@require_permission("invoices.create")
def create_invoice(
    data: InvoiceCreate,
    current_user: User = Depends(get_current_user),
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    from app.services.audit_service import log_audit_action
    """Create a direct invoice (not from challan)"""
    try:
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
            
            # Backfill quantities if they are 0 (e.g., from old invoice update)
            ok_qty = item.ok_qty
            cr_qty = item.cr_qty
            mr_qty = item.mr_qty

            if (not ok_qty and not cr_qty and not mr_qty) and (item.delivery_challan_item_id or item.delivery_challan_item_ids):
                # Collect IDs to fetch
                fetch_ids = []
                if item.delivery_challan_item_id:
                    fetch_ids.append(item.delivery_challan_item_id)
                if item.delivery_challan_item_ids:
                    fetch_ids.extend(item.delivery_challan_item_ids)
                
                if fetch_ids:
                    fetch_ids = list(set(fetch_ids))
                    # Fetch challan items
                    challan_items = db.query(DeliveryChallanItem).filter(
                        DeliveryChallanItem.id.in_(fetch_ids)
                    ).all()

                    # Sum up quantities (Handle None)
                    ok_qty = sum(float(ci.ok_qty or 0) for ci in challan_items)
                    cr_qty = sum(float(ci.cr_qty or 0) for ci in challan_items)
                    mr_qty = sum(float(ci.mr_qty or 0) for ci in challan_items)

            invoice_item = InvoiceItem(
                invoice_id=invoice.id,
                item_id=item.item_id,
                grn_no=item.grn_no,
                delivery_challan_item_id=item.delivery_challan_item_id,
                quantity=item.quantity,
                rate=item.rate,
                amount=amount,
                ok_qty=ok_qty,
                cr_qty=cr_qty,
                mr_qty=mr_qty,
                challan_item_ids=item.delivery_challan_item_ids
            )
            db.add(invoice_item)
            
            # Stock Transaction (OUT) for Direct Invoice (Only if not from Challan)
            if not item.delivery_challan_item_id and not item.delivery_challan_item_ids:
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
            
        gst_amount, grand_total = calculate_gst(subtotal, data.gst_rate)
        
        invoice.subtotal = subtotal
        invoice.gst_amount = gst_amount
        invoice.grand_total = grand_total
        
        # Update linked Delivery Challan Status
        # Collect all challan item IDs (both single and list)
        challan_item_ids = []
        for item in data.items:
            if item.delivery_challan_item_id:
                challan_item_ids.append(item.delivery_challan_item_id)
            if item.delivery_challan_item_ids:
                challan_item_ids.extend(item.delivery_challan_item_ids)
                
        if challan_item_ids:
            # Find Challan IDs using subquery strategy to avoid join issues
            # Remove duplicates
            unique_item_ids = list(set(challan_item_ids))
            
            challan_ids = db.query(DeliveryChallan.id).join(DeliveryChallanItem).filter(
                DeliveryChallanItem.id.in_(unique_item_ids)
            ).distinct().all()
            ids = [c[0] for c in challan_ids]
            
            if ids:
                db.query(DeliveryChallan).filter(
                    DeliveryChallan.id.in_(ids)
                ).update({DeliveryChallan.status: "delivered"}, synchronize_session=False)
        
        db.commit()
        db.refresh(invoice)

        # [AUDIT]
        log_audit_action(
            db=db,
            user_id=current_user.id,
            action="INVOICE_CREATE",
            company_id=company_id,
            details=f"Created Direct Invoice {invoice_number} for {grand_total}"
        )

        # [LOW STOCK ALERT] Check each invoiced item after commit
        # Non-fatal: any failure here must NOT break the invoice creation response
        try:
            from app.models.item import Item as ItemModel
            from app.services.notification_service import create_notification
            for inv_item in invoice.items:
                item_obj = db.query(ItemModel).filter(
                    ItemModel.id == inv_item.item_id,
                    ItemModel.company_id == company_id
                ).first()
                if item_obj and float(item_obj.current_stock) <= 5:
                    create_notification(
                        db=db,
                        company_id=company_id,
                        title=f"Low Stock: {item_obj.name}",
                        message=f"Only {float(item_obj.current_stock):.0f} unit(s) remaining. Consider restocking.",
                        type="warning",
                    )
        except Exception as notify_err:
            print(f"[Invoice] Low stock notification failed (non-fatal): {notify_err}")

        return invoice
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{invoice_id}", response_model=InvoiceResponse)
@require_permission("invoices.view")
def get_invoice(
    invoice_id: int,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
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
@require_permission("invoices.edit")
def update_invoice(
    invoice_id: int,
    data: InvoiceCreate,
    current_user: User = Depends(get_current_user),
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    from app.services.audit_service import log_audit_action
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
    old_challan_item_ids = []
    for item in old_items:
        if item.delivery_challan_item_id:
            old_challan_item_ids.append(item.delivery_challan_item_id)
        if item.challan_item_ids:
            old_challan_item_ids.extend(item.challan_item_ids)

    if old_challan_item_ids:
        # Find unique Challan IDs
        # Use simple distinct query on IDs first to be safe
        unique_ids = list(set(old_challan_item_ids))
        
        old_challan_ids_tuples = db.query(DeliveryChallan.id).join(DeliveryChallanItem).filter(
            DeliveryChallanItem.id.in_(unique_ids)
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
        
        # Backfill quantities if they are 0 (e.g., from old invoice update)
        ok_qty = item.ok_qty
        cr_qty = item.cr_qty
        mr_qty = item.mr_qty

        if (not ok_qty and not cr_qty and not mr_qty) and (item.delivery_challan_item_id or item.delivery_challan_item_ids):
            # Collect IDs to fetch
            fetch_ids = []
            if item.delivery_challan_item_id:
                fetch_ids.append(item.delivery_challan_item_id)
            if item.delivery_challan_item_ids:
                fetch_ids.extend(item.delivery_challan_item_ids)
            
            if fetch_ids:
                fetch_ids = list(set(fetch_ids))
                # Fetch challan items
                challan_items = db.query(DeliveryChallanItem).filter(
                    DeliveryChallanItem.id.in_(fetch_ids)
                ).all()

                # Sum up quantities
                ok_qty = sum(float(ci.ok_qty) for ci in challan_items)
                cr_qty = sum(float(ci.cr_qty) for ci in challan_items)
                mr_qty = sum(float(ci.mr_qty) for ci in challan_items)

        invoice_item = InvoiceItem(
            invoice_id=invoice.id,
            item_id=item.item_id,
            grn_no=item.grn_no,
            delivery_challan_item_id=item.delivery_challan_item_id,
            quantity=item.quantity,
            rate=item.rate,
            amount=amount,
            ok_qty=ok_qty,
            cr_qty=cr_qty,
            mr_qty=mr_qty,
            challan_item_ids=item.delivery_challan_item_ids
        )
        db.add(invoice_item)
        
        # New Stock Transaction (OUT) - Only if not from Challan
        if not item.delivery_challan_item_id and not item.delivery_challan_item_ids:
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
    gst_amount, grand_total = calculate_gst(subtotal, data.gst_rate)
    
    invoice.subtotal = subtotal
    invoice.gst_amount = gst_amount
    invoice.grand_total = grand_total
    
    # Update linked Delivery Challan Status
    # Collect all challan item IDs (both single and list)
    challan_item_ids = []
    for item in data.items:
        if item.delivery_challan_item_id:
            challan_item_ids.append(item.delivery_challan_item_id)
        if item.delivery_challan_item_ids:
            challan_item_ids.extend(item.delivery_challan_item_ids)
            
    if challan_item_ids:
        # Find Challan IDs using subquery strategy
        # Remove duplicates
        unique_item_ids = list(set(challan_item_ids))
        
        challan_ids = db.query(DeliveryChallan.id).join(DeliveryChallanItem).filter(
            DeliveryChallanItem.id.in_(unique_item_ids)
        ).distinct().all()
        ids = [c[0] for c in challan_ids]
        
        if ids:
            db.query(DeliveryChallan).filter(
                DeliveryChallan.id.in_(ids)
            ).update({DeliveryChallan.status: "delivered"}, synchronize_session=False)
            
    db.commit()
    db.refresh(invoice)
    
    # [AUDIT]
    log_audit_action(
        db=db,
        user_id=current_user.id,
        action="INVOICE_UPDATE",
        company_id=company_id,
        details=f"Updated Invoice {invoice.invoice_number} to {grand_total}"
    )
    
    return invoice


@router.delete("/{invoice_id}")
@require_permission("invoices.delete")
def delete_invoice(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    from app.services.audit_service import log_audit_action
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
    
    challan_item_ids = []
    for item in invoice_items:
        if item.delivery_challan_item_id:
            challan_item_ids.append(item.delivery_challan_item_id)
        if item.challan_item_ids:
            challan_item_ids.extend(item.challan_item_ids)
            
    if challan_item_ids:
        # Unique IDs
        unique_ids = list(set(challan_item_ids))
        
        challans = db.query(DeliveryChallan).join(DeliveryChallanItem).filter(
            DeliveryChallanItem.id.in_(unique_ids)
        ).distinct().all()
        for challan in challans:
            challan.status = "sent"
            db.add(challan)

    # 2. Check for Payment Allocations
    from app.models.payment_allocation import PaymentAllocation
    allocations = db.query(PaymentAllocation).filter(
        PaymentAllocation.invoice_id == invoice.id
    ).all()
    
    if allocations:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete invoice because it has {len(allocations)} linked payment(s). Please delete the payments first."
        )

    # 3. Delete Invoice Items
    db.query(InvoiceItem).filter(InvoiceItem.invoice_id == invoice.id).delete()

    invoice_number = invoice.invoice_number
    # 3. Delete Invoice
    db.delete(invoice)
    
    # [AUDIT]
    log_audit_action(
        db=db,
        user_id=current_user.id,
        action="INVOICE_DELETE",
        company_id=company_id,
        details=f"Deleted Invoice {invoice_number}"
    )
    
    db.commit()
    
    return {"message": "Invoice deleted", "reverted_challans": len(challan_item_ids)}





@router.post("/from-challan/{challan_id}", response_model=InvoiceResponse)
@require_permission("invoices.create")
def create_invoice_from_challan(
    challan_id: int,
    current_user: User = Depends(get_current_user),
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    from app.services.audit_service import log_audit_action
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

    # [AUDIT]
    log_audit_action(
        db=db,
        user_id=current_user.id,
        action="INVOICE_FROM_CHALLAN_CREATE",
        company_id=company_id,
        details=f"Created Invoice {invoice_number} from Challan {challan.challan_number}"
    )

    return invoice


@router.get("/", response_model=List[InvoiceResponse])
@require_permission("invoices.view")
def list_invoices(
    skip: int = Query(0, ge=0),
    limit: int = Query(10000, ge=1, le=100000),
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
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
        .offset(skip)
        .limit(limit)
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

class BulkPrintInvoiceRequest(BaseModel):
    invoice_ids: list[int]

@router.post("/bulk-print")
@require_permission("invoices.view")
async def bulk_print_invoices(
    request: BulkPrintInvoiceRequest,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        if not request.invoice_ids:
            raise HTTPException(400, "No invoice IDs provided")

        invoices = db.query(Invoice).options(
            joinedload(Invoice.party),
            joinedload(Invoice.challan),
            joinedload(Invoice.items).joinedload(InvoiceItem.item),
            joinedload(Invoice.items).joinedload(InvoiceItem.delivery_challan_item)
        ).filter(
            Invoice.id.in_(request.invoice_ids),
            Invoice.company_id == company_id
        ).all()
    
        if not invoices:
            raise HTTPException(404, "No valid invoices found")

        # Map to input order
        inv_map = {inv.id: inv for inv in invoices}
        ordered_invoices = [inv_map[cid] for cid in request.invoice_ids if cid in inv_map]

        company = db.query(Company).filter(Company.id == company_id).first()
        from app.core.config import get_backend_url
        base_url = get_backend_url()

        invoices_data = []
        for invoice in ordered_invoices:
            signature = create_url_signature(str(invoice.id))
            download_url = f"{base_url}/public/invoice/{invoice.id}/download?token={signature}"
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(download_url)
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")
            buffered = io.BytesIO()
            img.save(buffered, format="PNG")
            qr_code_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
            
            try:
                grand_total_words = num2words(invoice.grand_total, lang='en_IN').title().replace(",", "") + " Only"
            except:
                grand_total_words = f"{invoice.grand_total} Only"
                
            invoices_data.append({
                "invoice": invoice,
                "items": invoice.items,
                "company": company,
                "party": invoice.party,
                "qr_code": qr_code_b64,
                "grand_total_words": grand_total_words
            })

        template = env.get_template("invoice_bulk.html")
        html = template.render(
            invoices=invoices_data,
            format_currency=format_inr
        )
    
        pdf_content = await generate_pdf(html)
        return Response(
            content=pdf_content,
            media_type="text/html",
            headers={"Content-Disposition": "inline; filename=bulk-invoices.pdf"}
        )
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        try:
            with open("debug_log.txt", "a") as f:
                f.write(f"\n--- Invoice Bulk Print Error ---\n{error_msg}\n------------------------\n")
        except:
            pass
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{invoice_id}/print")
@require_permission("invoices.view")
async def print_invoice(
    invoice_id: int,
    request: Request,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
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
    from app.core.config import get_backend_url
    base_url = get_backend_url()
            
    signature = create_url_signature(str(invoice_id))
    download_url = f"{base_url}/public/invoice/{invoice_id}/download?token={signature}"
    
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
        media_type="text/html",
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
        media_type="text/html",
        headers={"Content-Disposition": f"inline; filename={invoice.invoice_number}.pdf"}
    )


@router.get("/{invoice_id}/share")
@require_permission("invoices.view")
async def share_invoice(
    invoice_id: int,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _ = Depends(require_feature("WHATSAPP_SHARE"))
):
    """Generate a WhatsApp-ready sharing link and message for an invoice"""
    from app.core.config import get_backend_url
    from app.core.security import create_url_signature
    import urllib.parse
    
    try:
        invoice = db.query(Invoice).options(
            joinedload(Invoice.party)
        ).filter(
            Invoice.id == invoice_id,
            Invoice.company_id == company_id
        ).first()
        
        if not invoice:
            raise HTTPException(404, "Invoice not found")

        base_url = get_backend_url()
        signature = create_url_signature(str(invoice_id))
        download_url = f"{base_url}/public/invoice/{invoice_id}/download?token={signature}"
        
        # Format the message
        company = db.query(Company).filter(Company.id == company_id).first()
        company_name = company.name if company else "Our Company"
        party_name = invoice.party.name if invoice.party else "Customer"
        
        # Pure ASCII message — works on ALL WhatsApp versions and devices
        status_str = invoice.payment_status.title() if invoice.payment_status else "Pending"
        due_str    = invoice.due_date.strftime('%d %b %Y') if invoice.due_date else "N/A"
        inv_date   = invoice.invoice_date.strftime('%d %b %Y') if invoice.invoice_date else "N/A"
        amount_str = f"Rs. {float(invoice.grand_total or 0):,.2f}"

        lines = [
            f"*Invoice from {company_name}*",
            "-" * 32,
            f"Hello {party_name},",
            "",
            f"Please find your *Invoice {invoice.invoice_number}* details below.",
            "",
            f"*Invoice Date :* {inv_date}",
            f"*Due Date     :* {due_str}",
            f"*Total Amount :* {amount_str}",
            f"*Status       :* {status_str}",
            "",
            "*Download Invoice:*",
            download_url,
            "",
            "Thank you for your business!",
            "For any queries, feel free to reply to this message.",
        ]
        message = "\n".join(lines)

        # Create the whatsapp deep link (explicit utf-8 encoding, safe='' to encode everything)
        encoded_message = urllib.parse.quote(message, safe="", encoding="utf-8")
        whatsapp_url = f"https://wa.me/?text={encoded_message}"
        
        # The user requested NOT to pre-fill the phone number so they can manually pick the contact.
        # Therefore, we only use https://wa.me/?text=... which prompts for contact selection.
        # if invoice.party and invoice.party.phone:
        #     phone = ''.join(filter(str.isdigit, invoice.party.phone))
        #     if len(phone) == 10:
        #         phone = f"91{phone}"
        #     whatsapp_url = f"https://wa.me/{phone}?text={encoded_message}"
            
        return {
            "invoice_id": invoice.id,
            "whatsapp_url": whatsapp_url,
            "message": message,
            "download_url": download_url
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ===============================
# E-Way Bill Endpoints
# ===============================

from app.schemas.eway_bill import (
    EWayBillCreate,
    EWayBillManualCreate,
    EWayBillResponse,
    EWayBillPreviewRequest,
    EWayCancelRequest,
)
from app.utils.eway_bill_utils import (
    validate_eway_bill_eligibility,
    calculate_eway_bill_validity,
    format_hsn_code,
    get_state_name
)


@router.post("/{invoice_id}/eway-bill", response_model=InvoiceResponse)
def save_eway_bill_details(
    invoice_id: int,
    data: EWayBillCreate,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Save e-way bill transport details to invoice"""
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.company_id == company_id
    ).first()
    
    if not invoice:
        raise HTTPException(404, "Invoice not found")
    
    # Validate eligibility
    if not validate_eway_bill_eligibility(invoice.grand_total):
        raise HTTPException(
            400, 
            f"E-way bill not required for invoices below ₹50,000. Current amount: ₹{invoice.grand_total}"
        )
    
    # Update invoice with e-way bill details
    invoice.transport_mode = data.transport_mode
    invoice.vehicle_number = data.vehicle_number
    invoice.transport_distance = data.transport_distance
    invoice.transporter_id = data.transporter_id
    invoice.vehicle_type = data.vehicle_type or "Regular"
    invoice.transporter_doc_no = data.transporter_doc_no
    invoice.transporter_doc_date = data.transporter_doc_date
    
    db.commit()
    db.refresh(invoice)
    
    return invoice


@router.get("/{invoice_id}/eway-bill/check-eligibility")
def check_eway_bill_eligibility(
    invoice_id: int,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Check if invoice is eligible for e-way bill"""
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.company_id == company_id
    ).first()
    
    if not invoice:
        raise HTTPException(404, "Invoice not found")
    
    is_eligible = validate_eway_bill_eligibility(invoice.grand_total)
    
    return {
        "eligible": is_eligible,
        "invoice_amount": float(invoice.grand_total),
        "threshold": 50000,
        "message": "E-way bill required" if is_eligible else "E-way bill not required (amount below ₹50,000)"
    }


@router.post("/{invoice_id}/eway-bill/preview")
async def generate_eway_bill_preview(
    invoice_id: int,
    data: EWayBillPreviewRequest,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Generate e-way bill preview data (without saving)"""
    invoice = db.query(Invoice).options(
        joinedload(Invoice.party),
        joinedload(Invoice.items).joinedload(InvoiceItem.item)
    ).filter(
        Invoice.id == invoice_id,
        Invoice.company_id == company_id
    ).first()
    
    if not invoice:
        raise HTTPException(404, "Invoice not found")
    
    # Validate eligibility
    if not validate_eway_bill_eligibility(invoice.grand_total):
        raise HTTPException(
            400,
            f"E-way bill not required for invoices below ₹50,000"
        )
    
    company = db.query(Company).filter(Company.id == company_id).first()
    
    # Calculate validity
    validity_days, validity_desc = calculate_eway_bill_validity(data.transport_distance)
    
    # Prepare e-way bill data
    eway_data = {
        "invoice": invoice,
        "company": company,
        "party": invoice.party,
        "items": invoice.items,
        "transport_mode": data.transport_mode,
        "vehicle_number": data.vehicle_number,
        "transport_distance": data.transport_distance,
        "transporter_id": data.transporter_id,
        "vehicle_type": data.vehicle_type or "Regular",
        "transporter_doc_no": data.transporter_doc_no,
        "transporter_doc_date": data.transporter_doc_date,
        "validity_days": validity_days,
        "validity_description": validity_desc,
        "company_state": get_state_name(company.state_code) if company.state_code else "",
        "party_state": get_state_name(invoice.party.state_code) if invoice.party.state_code else "",
    }
    
    # Render HTML template
    template = env.get_template("eway_bill.html")
    html = template.render(**eway_data, format_currency=format_inr)
    
    # Generate PDF
    pdf_content = await generate_pdf(html)
    
    return Response(
        content=pdf_content,
        media_type="text/html",
        headers={"Content-Disposition": f"inline; filename=EWayBill_{invoice.invoice_number}.pdf"}
    )


@router.get("/{invoice_id}/eway-bill/print")
async def print_eway_bill(
    invoice_id: int,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Print e-way bill using saved transport details"""
    try:
        invoice = db.query(Invoice).options(
            joinedload(Invoice.party),
            joinedload(Invoice.items).joinedload(InvoiceItem.item)
        ).filter(
            Invoice.id == invoice_id,
            Invoice.company_id == company_id
        ).first()
        
        if not invoice:
            raise HTTPException(404, "Invoice not found")
        
        # Check if transport details are saved
        if not invoice.transport_mode or not invoice.vehicle_number or not invoice.transport_distance:
            raise HTTPException(
                400,
                "E-way bill transport details not found. Please save transport details first."
            )
        
        # Validate eligibility
        if not validate_eway_bill_eligibility(invoice.grand_total):
            raise HTTPException(400, "E-way bill not required for invoices below ₹50,000")
        
        company = db.query(Company).filter(Company.id == company_id).first()
        
        # Calculate validity
        validity_days, validity_desc = calculate_eway_bill_validity(invoice.transport_distance)
        
        from datetime import datetime
        
        # Prepare e-way bill data
        eway_data = {
            "invoice": invoice,
            "company": company,
            "party": invoice.party,
            "items": invoice.items,
            "transport_mode": invoice.transport_mode,
            "vehicle_number": invoice.vehicle_number,
            "transport_distance": invoice.transport_distance,
            "transporter_id": invoice.transporter_id,
            "vehicle_type": invoice.vehicle_type or "Regular",
            "transporter_doc_no": invoice.transporter_doc_no,
            "transporter_doc_date": invoice.transporter_doc_date,
            "validity_days": validity_days,
            "validity_description": validity_desc,
            "company_state": get_state_name(company.state_code) if company.state_code else "",
            "party_state": get_state_name(invoice.party.state_code) if invoice.party.state_code else "",
            "generated_at": datetime.now().strftime("%d-%m-%Y %H:%M:%S")
        }
        
        # Render HTML template
        template = env.get_template("eway_bill.html")
        html = template.render(**eway_data, format_currency=format_inr)
        
        # Generate PDF
        pdf_content = await generate_pdf(html)
        
        return Response(
            content=pdf_content,
            media_type="text/html",
            headers={"Content-Disposition": f"inline; filename=EWayBill_{invoice.invoice_number}.pdf"}
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        import traceback
        print(f"ERROR generating E-Way Bill PDF: {e}")
        traceback.print_exc()
        raise HTTPException(500, f"Failed to generate E-Way Bill PDF: {str(e)}")



# ═══════════════════════════════════════════════════════════════════════════════
# E-WAY BILL — ONLINE (NIC API Auto-Generate)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/{invoice_id}/eway-bill/generate", response_model=EWayBillResponse)
async def generate_eway_bill_online(
    invoice_id: int,
    data: EWayBillCreate,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db),
):
    """
    ONLINE MODE — Generate E-Way Bill automatically via NIC API.

    Steps:
      1. Validates invoice eligibility (>= ₹50,000)
      2. Authenticates with NIC EWB portal using credentials from .env
      3. Builds the EWB JSON payload from invoice, party, company & items
      4. Calls NIC API → receives EWB number
      5. Saves EWB number + transport details to the Invoice record

    Requires: EWAY_BILL_USERNAME, EWAY_BILL_PASSWORD, EWAY_BILL_GSTIN in .env
    """
    from app.services.eway_bill_service import eway_bill_service

    # ── 1. Fetch invoice with relations ──────────────────────────────────────
    invoice = (
        db.query(Invoice)
        .options(
            joinedload(Invoice.items).joinedload(InvoiceItem.item),
            joinedload(Invoice.party),
            joinedload(Invoice.company),
        )
        .filter(Invoice.id == invoice_id, Invoice.company_id == company_id)
        .first()
    )
    if not invoice:
        raise HTTPException(404, "Invoice not found")

    # ── 2. Guard: already has an EWB number ──────────────────────────────────
    if invoice.eway_bill_number:
        raise HTTPException(
            400,
            f"E-Way Bill already exists for this invoice: {invoice.eway_bill_number}. "
            "Cancel it first before generating a new one."
        )

    # ── 3. Eligibility check ─────────────────────────────────────────────────
    if not validate_eway_bill_eligibility(invoice.grand_total):
        raise HTTPException(
            400,
            f"E-Way Bill not required for invoices below ₹50,000. "
            f"Current amount: ₹{invoice.grand_total}"
        )

    # ── 4. Company GST required ──────────────────────────────────────────────
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company or not company.gst_number:
        raise HTTPException(400, "Company GSTIN is required to generate an E-Way Bill.")

    # ── 5. Build NIC payload ─────────────────────────────────────────────────
    transport_dict = data.model_dump()
    try:
        payload = eway_bill_service.build_ewb_payload(
            invoice=invoice,
            company=company,
            party=invoice.party,
            items=invoice.items,
            transport_data=transport_dict,
        )
    except Exception as e:
        raise HTTPException(400, f"Could not build EWB payload: {str(e)}")

    # ── 6. Call NIC API ──────────────────────────────────────────────────────
    try:
        result = await eway_bill_service.generate_eway_bill(payload)
    except ValueError as e:
        # Business errors from NIC (wrong GSTIN, HSN, etc.)
        raise HTTPException(422, str(e))
    except Exception as e:
        raise HTTPException(503, f"NIC EWB API unreachable: {str(e)}")

    ewb_number = str(result.get("ewbNo", ""))
    if not ewb_number:
        raise HTTPException(502, "NIC API returned success but no EWB number. Please retry.")

    # ── 7. Save to invoice ───────────────────────────────────────────────────
    invoice.eway_bill_number    = ewb_number
    invoice.eway_bill_date      = date.today()
    invoice.transport_mode      = data.transport_mode
    invoice.vehicle_number      = data.vehicle_number
    invoice.transporter_id      = data.transporter_id
    invoice.transport_distance  = data.transport_distance
    invoice.vehicle_type        = data.vehicle_type or "Regular"
    invoice.transporter_doc_no  = data.transporter_doc_no
    invoice.transporter_doc_date = data.transporter_doc_date
    db.commit()
    db.refresh(invoice)

    # ── 8. Build response ────────────────────────────────────────────────────
    validity_days, validity_desc = calculate_eway_bill_validity(data.transport_distance)

    return EWayBillResponse(
        eway_bill_number=invoice.eway_bill_number,
        eway_bill_date=invoice.eway_bill_date,
        transport_mode=invoice.transport_mode,
        vehicle_number=invoice.vehicle_number,
        transporter_id=invoice.transporter_id,
        transport_distance=invoice.transport_distance,
        vehicle_type=invoice.vehicle_type,
        transporter_doc_no=invoice.transporter_doc_no,
        transporter_doc_date=invoice.transporter_doc_date,
        validity_days=validity_days,
        validity_description=validity_desc,
        eway_bill_mode="online",
        message=f"E-Way Bill {ewb_number} generated successfully via NIC portal.",
    )


# ═══════════════════════════════════════════════════════════════════════════════
# E-WAY BILL — OFFLINE/MANUAL (Client fills on NIC portal, enters number here)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/{invoice_id}/eway-bill/manual", response_model=EWayBillResponse)
def save_eway_bill_manual(
    invoice_id: int,
    data: EWayBillManualCreate,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db),
):
    """
    OFFLINE/MANUAL MODE — Client generated EWB on NIC portal manually.
    Just saves the EWB number + transport details to the Invoice record.

    No NIC API call is made. No credentials required.
    The 12-digit EWB number is validated for format only.
    """
    # ── 1. Fetch invoice ─────────────────────────────────────────────────────
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.company_id == company_id
    ).first()
    if not invoice:
        raise HTTPException(404, "Invoice not found")

    # ── 2. Guard: already has EWB ────────────────────────────────────────────
    if invoice.eway_bill_number:
        raise HTTPException(
            400,
            f"This invoice already has E-Way Bill: {invoice.eway_bill_number}. "
            "Use the update endpoint to change it."
        )

    # ── 3. Eligibility check ─────────────────────────────────────────────────
    if not validate_eway_bill_eligibility(invoice.grand_total):
        raise HTTPException(
            400,
            f"E-Way Bill not required for invoices below ₹50,000. "
            f"Current amount: ₹{invoice.grand_total}"
        )

    # ── 4. Save EWB + transport details ─────────────────────────────────────
    invoice.eway_bill_number     = data.eway_bill_number
    invoice.eway_bill_date       = data.eway_bill_date
    invoice.transport_mode       = data.transport_mode
    invoice.vehicle_number       = data.vehicle_number
    invoice.transporter_id       = data.transporter_id
    invoice.transport_distance   = data.transport_distance
    invoice.vehicle_type         = data.vehicle_type or "Regular"
    invoice.transporter_doc_no   = data.transporter_doc_no
    invoice.transporter_doc_date = data.transporter_doc_date
    db.commit()
    db.refresh(invoice)

    # ── 5. Build response ────────────────────────────────────────────────────
    validity_days, validity_desc = calculate_eway_bill_validity(data.transport_distance)

    return EWayBillResponse(
        eway_bill_number=invoice.eway_bill_number,
        eway_bill_date=invoice.eway_bill_date,
        transport_mode=invoice.transport_mode,
        vehicle_number=invoice.vehicle_number,
        transporter_id=invoice.transporter_id,
        transport_distance=invoice.transport_distance,
        vehicle_type=invoice.vehicle_type,
        transporter_doc_no=invoice.transporter_doc_no,
        transporter_doc_date=invoice.transporter_doc_date,
        validity_days=validity_days,
        validity_description=validity_desc,
        eway_bill_mode="manual",
        message=f"E-Way Bill {data.eway_bill_number} saved successfully (manual entry).",
    )


# ═══════════════════════════════════════════════════════════════════════════════
# E-WAY BILL — UPDATE (change transport details on existing EWB)
# ═══════════════════════════════════════════════════════════════════════════════

@router.put("/{invoice_id}/eway-bill/update", response_model=EWayBillResponse)
def update_eway_bill_details(
    invoice_id: int,
    data: EWayBillManualCreate,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db),
):
    """
    Update transport details + EWB number on an existing EWB record.
    Used when client wants to correct vehicle number, distance, etc.
    Works for BOTH online and manual EWBs.
    """
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.company_id == company_id
    ).first()
    if not invoice:
        raise HTTPException(404, "Invoice not found")
    if not invoice.eway_bill_number:
        raise HTTPException(400, "No E-Way Bill found. Generate one first.")

    invoice.eway_bill_number     = data.eway_bill_number
    invoice.eway_bill_date       = data.eway_bill_date
    invoice.transport_mode       = data.transport_mode
    invoice.vehicle_number       = data.vehicle_number
    invoice.transporter_id       = data.transporter_id
    invoice.transport_distance   = data.transport_distance
    invoice.vehicle_type         = data.vehicle_type or "Regular"
    invoice.transporter_doc_no   = data.transporter_doc_no
    invoice.transporter_doc_date = data.transporter_doc_date
    db.commit()
    db.refresh(invoice)

    validity_days, validity_desc = calculate_eway_bill_validity(data.transport_distance)

    return EWayBillResponse(
        eway_bill_number=invoice.eway_bill_number,
        eway_bill_date=invoice.eway_bill_date,
        transport_mode=invoice.transport_mode,
        vehicle_number=invoice.vehicle_number,
        transporter_id=invoice.transporter_id,
        transport_distance=invoice.transport_distance,
        vehicle_type=invoice.vehicle_type,
        transporter_doc_no=invoice.transporter_doc_no,
        transporter_doc_date=invoice.transporter_doc_date,
        validity_days=validity_days,
        validity_description=validity_desc,
        eway_bill_mode="manual",
        message="E-Way Bill details updated successfully.",
    )


# ═══════════════════════════════════════════════════════════════════════════════
# E-WAY BILL — CANCEL via NIC API (online only, within 24 hours)
# ═══════════════════════════════════════════════════════════════════════════════

@router.delete("/{invoice_id}/eway-bill/cancel-api")
async def cancel_eway_bill_via_api(
    invoice_id: int,
    data: EWayCancelRequest,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db),
):
    """
    Cancel E-Way Bill via NIC API (must be within 24 hours of generation).
    Clears EWB number from the invoice after successful cancellation.
    """
    from app.services.eway_bill_service import eway_bill_service

    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.company_id == company_id
    ).first()
    if not invoice:
        raise HTTPException(404, "Invoice not found")
    if not invoice.eway_bill_number:
        raise HTTPException(400, "No E-Way Bill found for this invoice.")

    try:
        result = await eway_bill_service.cancel_eway_bill(
            ewb_number=invoice.eway_bill_number,
            cancel_reason=data.cancel_reason,
            cancel_remark=data.cancel_remark or "Cancelled",
        )
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception as e:
        raise HTTPException(503, f"NIC EWB API Error: {str(e)}")

    # Clear EWB fields
    cancelled_ewb = invoice.eway_bill_number
    invoice.eway_bill_number  = None
    invoice.eway_bill_date    = None
    db.commit()

    return {
        "message": f"E-Way Bill {cancelled_ewb} cancelled successfully via NIC API.",
        "api_response": result,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# E-WAY BILL — CLEAR (remove EWB from invoice locally, no NIC API call)
# ═══════════════════════════════════════════════════════════════════════════════

@router.delete("/{invoice_id}/eway-bill/clear")
def clear_eway_bill_local(
    invoice_id: int,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db),
):
    """
    Locally remove EWB details from the invoice (no NIC API call).
    Use this for manual EWBs or when NIC API cancel is not needed.
    """
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.company_id == company_id
    ).first()
    if not invoice:
        raise HTTPException(404, "Invoice not found")
    if not invoice.eway_bill_number:
        raise HTTPException(400, "No E-Way Bill to clear on this invoice.")

    cleared_ewb = invoice.eway_bill_number
    invoice.eway_bill_number     = None
    invoice.eway_bill_date       = None
    invoice.transport_mode       = None
    invoice.vehicle_number       = None
    invoice.transporter_id       = None
    invoice.transport_distance   = None
    invoice.vehicle_type         = None
    invoice.transporter_doc_no   = None
    invoice.transporter_doc_date = None
    db.commit()

    return {"message": f"E-Way Bill {cleared_ewb} cleared from invoice (local only)."}


# ═══════════════════════════════════════════════════════════════════════════════
# E-WAY BILL — STATUS CHECK via NIC API
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/{invoice_id}/eway-bill/api-status")
async def get_eway_bill_api_status(
    invoice_id: int,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db),
):
    """
    Fetch live EWB status from NIC portal.
    Returns full EWB details including valid-upto date.
    """
    from app.services.eway_bill_service import eway_bill_service

    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.company_id == company_id
    ).first()
    if not invoice:
        raise HTTPException(404, "Invoice not found")
    if not invoice.eway_bill_number:
        raise HTTPException(400, "No E-Way Bill found for this invoice.")

    try:
        result = await eway_bill_service.get_eway_bill_status(invoice.eway_bill_number)
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception as e:
        raise HTTPException(503, f"NIC EWB API Error: {str(e)}")

    return {
        "eway_bill_number": invoice.eway_bill_number,
        "nic_status": result,
    }
