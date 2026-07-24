from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_
from fastapi.responses import Response
from jinja2 import Environment, FileSystemLoader, select_autoescape
from datetime import datetime
import os

# [MIGRATED] Playwright removed — now uses shared pdf_service (browser-side rendering)
# This eliminates Chromium dependency and Passenger/WSGI deadlock risk on shared hosting.
from app.services.pdf_service import generate_pdf

from app.database.session import get_db
from app.models.company import Company
from app.models.financial_year import FinancialYear
from app.models.financial_year import FinancialYear
from app.models.party_challan_item import PartyChallanItem
from app.models.party_challan import PartyChallan
from app.models.invoice import Invoice
from typing import Optional
import io, base64, qrcode
from app.models.delivery_challan_item import DeliveryChallanItem
from app.models.invoice_item import InvoiceItem
from app.models.party import Party
from app.models.item import Item
from app.models.payment import Payment
from app.models.stock_transaction import StockTransaction
from app.models.delivery_challan import DeliveryChallan
from app.core.security import verify_url_signature

router = APIRouter(prefix="/public/reports", tags=["Public Reports"])

# Set up Jinja2
templates_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
env = Environment(
    loader=FileSystemLoader(templates_dir),
    autoescape=select_autoescape(['html', 'xml'])
)

@router.get("/ledger/download")
async def public_ledger_download(
    company_id: int,
    fy_id: int,
    token: str,
    party_id: int = None,
    start_date: str = None,
    end_date: str = None,
    db: Session = Depends(get_db)
):
    """
    Public endpoint to download a Party Stock Ledger PDF.
    Verifies signature of company_id:fy_id:party_id (if party_id else 'all')
    """
    
    # 1. Verify Signature
    # Data string format: "company_id:fy_id:party_id" or "company_id:fy_id:all"
    party_val = str(party_id) if party_id else "all"
    data_to_sign = f"{company_id}:{fy_id}:{party_val}"
    
    if not verify_url_signature(data_to_sign, token):
        raise HTTPException(status_code=403, detail="Invalid or expired link")
    
    # 2. Get Context Data
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    fy = db.query(FinancialYear).filter(FinancialYear.id == fy_id).first()
    if not fy:
        raise HTTPException(status_code=404, detail="Financial Year not found")
        
    party_name = None
    if party_id:
        party = db.query(Party).filter(Party.id == party_id).first()
        if party:
            party_name = party.name

    # Parse Dates
    start = datetime.strptime(start_date, "%Y-%m-%d").date() if start_date else fy.start_date
    end = datetime.strptime(end_date, "%Y-%m-%d").date() if end_date else fy.end_date

    # 3. Query Data (Replicated Logic)
    query = db.query(PartyChallanItem).join(
        PartyChallan
    ).options(
        joinedload(PartyChallanItem.party_challan).joinedload(PartyChallan.party),
        joinedload(PartyChallanItem.item)
    ).filter(
        PartyChallan.company_id == company_id,
        or_(
            PartyChallan.financial_year_id == fy.id,
            and_(
                PartyChallan.financial_year_id != fy.id,
                PartyChallan.status != "completed",
                PartyChallan.status != "cancelled"
            )
        )
    )

    if party_id:
        query = query.filter(PartyChallan.party_id == party_id)

    items = query.order_by(PartyChallan.challan_date).all()

    # 4. Aggregate Data
    ledger_map = {}
    for row in items:
        key = f"{row.party_challan.party.name}-{row.item.name}"
        if key not in ledger_map:
            ledger_map[key] = {
                "party": row.party_challan.party.name,
                "item": row.item.name,
                "opening": 0.0,
                "in": 0.0,
                "out": 0.0,
                "balance": 0.0
            }
            
        c_date = row.party_challan.challan_date
        pending_qty = float(row.quantity_ordered) - float(row.quantity_delivered)
        pending = max(0.0, pending_qty)

        # Logic to match main report filtering
        if c_date < start:
             ledger_map[key]["opening"] += pending
             ledger_map[key]["balance"] += pending
        elif c_date <= end:
             ledger_map[key]["in"] += float(row.quantity_ordered)
             ledger_map[key]["out"] += float(row.quantity_delivered)
             ledger_map[key]["balance"] += pending
        
        # If date is > end, we ignore it

    # Format numbers
    ledger_data = []
    for item in ledger_map.values():
        # Only show if there's activity or opening balance
        if item["opening"] == 0 and item["in"] == 0 and item["out"] == 0:
            continue

        item["opening"] = f"{item['opening']:.2f}"
        item["in"] = f"{item['in']:.2f}"
        item["out"] = f"{item['out']:.2f}"
        item["balance"] = f"{item['balance']:.2f}"
        ledger_data.append(item)

    # 5. Render Template (No QR code needed on the downloaded copy, or reuse same URL)
    template = env.get_template("party_ledger.html")
    
    html_content = template.render(
        company=company,
        financial_year=f"{fy.start_date.year}-{fy.end_date.year}",
        start_date=start,
        end_date=end,
        party_name=party_name,
        generation_date=datetime.now().strftime("%d-%m-%Y %H:%M"),
        ledger_data=ledger_data,
        qr_code=None # Avoid recursive QR or just omit
    )

    # [MIGRATED] Generate via pdf_service (returns HTML bytes; browser handles print/save)
    pdf_data = await generate_pdf(html_content)
    
    filename = f"Stock_Ledger_{party_name.replace(' ', '_')}.pdf" if party_name else "Stock_Ledger_All.pdf"
    
    return Response(
        content=pdf_data,
        media_type="text/html; charset=utf-8",
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )

# =========================================================
# PUBLIC STATEMENT REPORT
# =========================================================
@router.get("/statement/download")
async def public_statement_download(
    party_id: int,
    company_id: int,
    token: str,
    start_date: str = None,
    end_date: str = None,
    db: Session = Depends(get_db)
):
    """
    Public endpoint to download Party Statement.
    """
    from sqlalchemy import func
    from app.models.invoice import Invoice
    from app.models.payment import Payment

    # 1. Verify Signature
    data_to_sign = f"{company_id}:{party_id}"
    # Note: If dates are part of logic, they should ideally be signed, 
    # but strictly verify what was signed in reports.py.
    # reports.py logic signs: f"{company_id}:{party_id}" (based on standard pattern) is unsafe if params change.
    # But let's verify what reports.py DOES (we haven't updated it yet).
    # We will update reports.py to sign f"{company_id}:{party_id}:{start_date}:{end_date}" for security.
    
    # For now, let's verify mostly dynamic signature construction to be safe
    sig_data = f"{company_id}:{party_id}"
    if start_date:
        sig_data += f":{start_date}"
    if end_date:
        sig_data += f":{end_date}"
        
    if not verify_url_signature(sig_data, token):
         raise HTTPException(status_code=403, detail="Invalid link")

    # 2. Get Context
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    party = db.query(Party).filter(Party.id == party_id, Party.company_id == company_id).first()
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")
        
    fy = db.query(FinancialYear).filter(FinancialYear.company_id == company_id, FinancialYear.is_active == True).first()
    
    if start_date:
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
    elif fy:
        start = fy.start_date
    else:
        start = datetime.now().date()
        
    if end_date:
        end = datetime.strptime(end_date, "%Y-%m-%d").date()
    elif fy:
        end = fy.end_date
    else:
        end = datetime.now().date()

    # 3. Logic (Same as reports.py)
    opening_balance = float(party.opening_balance)
    prev_invoices = db.query(func.sum(Invoice.grand_total)).filter(
        Invoice.party_id == party_id,
        Invoice.company_id == company_id,
        Invoice.invoice_date < start,
        Invoice.status != "CANCELLED"
    ).scalar() or 0
    
    prev_received = db.query(func.sum(Payment.amount)).filter(
        Payment.party_id == party_id,
        Payment.company_id == company_id,
        Payment.payment_date < start,
        Payment.payment_type == "RECEIVED"
    ).scalar() or 0
    
    prev_paid = db.query(func.sum(Payment.amount)).filter(
        Payment.party_id == party_id,
        Payment.company_id == company_id,
        Payment.payment_date < start,
        Payment.payment_type == "PAID"
    ).scalar() or 0
    
    opening_balance += (float(prev_invoices) - float(prev_received) + float(prev_paid))
    
    invoices = db.query(Invoice).filter(
        Invoice.party_id == party_id,
        Invoice.company_id == company_id,
        Invoice.invoice_date >= start,
        Invoice.invoice_date <= end,
        Invoice.status != "CANCELLED"
    ).all()
    
    payments = db.query(Payment).filter(
        Payment.party_id == party_id,
        Payment.company_id == company_id,
        Payment.payment_date >= start,
        Payment.payment_date <= end
    ).all()
    
    transactions = []
    for inv in invoices:
        transactions.append({
            "date": inv.invoice_date,
            "type": "INVOICE",
            "ref": inv.invoice_number,
            "debit": float(inv.grand_total),
            "credit": 0.0,
            "description": "Sales Invoice"
        })
        
    for pay in payments:
        transactions.append({
            "date": pay.payment_date,
            "type": "PAYMENT",
            "ref": pay.reference_number or f"{pay.payment_mode}",
            "debit": 0.0,
            "credit": float(pay.amount),
            "description": f"Payment Received ({pay.payment_mode})"
        })
        
    transactions.sort(key=lambda x: x["date"])
    
    formatted_transactions = []
    running_balance = opening_balance
    total_debit = 0.0
    total_credit = 0.0
    
    formatted_transactions.append({
        "date": start,
        "type": "OPENING",
        "ref": "-",
        "description": "Opening Balance",
        "debit": None,
        "credit": None,
        "balance": f"{running_balance:,.2f}"
    })
    
    for tx in transactions:
        running_balance += (tx["debit"] - tx["credit"])
        total_debit += tx["debit"]
        total_credit += tx["credit"]
        
        formatted_transactions.append({
            "date": tx["date"],
            "type": tx["type"],
            "ref": tx["ref"],
            "description": tx["description"],
            "debit": f"{tx['debit']:,.2f}" if tx["debit"] > 0 else None,
            "credit": f"{tx['credit']:,.2f}" if tx["credit"] > 0 else None,
            "balance": f"{running_balance:,.2f}"
        })

    # Render
    template = env.get_template("party_statement.html")
    html_content = template.render(
        company=company,
        party=party,
        financial_year=f"{start.year}-{end.year}",
        start_date=start,
        end_date=end,
        generation_date=datetime.now().strftime("%d-%m-%Y %H:%M"),
        transactions=formatted_transactions,
        opening_balance=f"{opening_balance:,.2f}",
        closing_balance=f"{running_balance:,.2f}",
        total_debit=f"{total_debit:,.2f}",
        total_credit=f"{total_credit:,.2f}",
        qr_code=None
    )
    
    # [MIGRATED] Generate via pdf_service (returns HTML bytes; browser handles print/save)
    pdf_data = await generate_pdf(html_content)
    
    safe_name = party.name.replace(' ', '_')
    filename = f"Statement_{safe_name}.pdf"
    
    return Response(
        content=pdf_data,
        media_type="text/html; charset=utf-8",
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )


# =========================================================
# PUBLIC STOCK LEDGER
# =========================================================
@router.get("/stock/download")
async def public_stock_download(
    item_id: int,
    company_id: int,
    token: str,
    party_id: int = None,
    start_date: str = None,
    end_date: str = None,
    db: Session = Depends(get_db)
):
    """
    Public endpoint to download Stock Ledger.
    """
    # 1. Verify Signature
    # params: company_id:item_id:party_id
    party_val = str(party_id) if party_id else "all"
    sig_data = f"{company_id}:{item_id}:{party_val}"
    
    if start_date:
        sig_data += f":{start_date}"
    if end_date:
         sig_data += f":{end_date}"
         
    if not verify_url_signature(sig_data, token):
         raise HTTPException(status_code=403, detail="Invalid link")
         
    # 2. Context
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    fy = db.query(FinancialYear).filter(FinancialYear.company_id == company_id, FinancialYear.is_active == True).first()
    
    start = datetime.strptime(start_date, "%Y-%m-%d") if start_date else datetime.combine(fy.start_date, datetime.min.time())
    end = datetime.strptime(end_date, "%Y-%m-%d") if end_date else datetime.combine(fy.end_date, datetime.max.time())
    if end_date:
        end = end.replace(hour=23, minute=59, second=59)
        
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    selected_party = None
    if party_id:
        selected_party = db.query(Party).filter(Party.id == party_id).first()
        
    # 3. Logic (Same as reports.py)
    from sqlalchemy import func
    
    # Opening Balance
    prev_in = db.query(func.sum(StockTransaction.quantity)).filter(
        StockTransaction.item_id == item_id,
        StockTransaction.company_id == company_id,
        StockTransaction.transaction_type == "IN",
        StockTransaction.created_at < start
    ).scalar() or 0
    
    prev_out = db.query(func.sum(StockTransaction.quantity)).filter(
        StockTransaction.item_id == item_id,
        StockTransaction.company_id == company_id,
        StockTransaction.transaction_type == "OUT",
        StockTransaction.created_at < start
    ).scalar() or 0
    
    opening_balance = float(prev_in) - float(prev_out)
    
    if party_id:
        opening_balance = 0.0
        
    # Transactions
    transactions = db.query(StockTransaction).filter(
        StockTransaction.item_id == item_id,
        StockTransaction.company_id == company_id,
        StockTransaction.created_at >= start,
        StockTransaction.created_at <= end
    ).order_by(StockTransaction.created_at.asc()).all()
    
    # Resolvers
    challan_ids = [tx.reference_id for tx in transactions if tx.reference_type == "DELIVERY_CHALLAN"]
    invoice_ids = [tx.reference_id for tx in transactions if tx.reference_type == "INVOICE"]
    party_challan_ids = [tx.reference_id for tx in transactions if tx.reference_type == "PARTY_CHALLAN"]
    
    challan_map = {}
    if challan_ids:
        challans = db.query(DeliveryChallan).options(joinedload(DeliveryChallan.party)).filter(DeliveryChallan.id.in_(challan_ids)).all()
        challan_map = {c.id: c for c in challans}
        
    invoice_map = {}
    if invoice_ids:
        invoices = db.query(Invoice).options(joinedload(Invoice.party)).filter(Invoice.id.in_(invoice_ids)).all()
        invoice_map = {i.id: i for i in invoices}

    party_challan_map = {}
    if party_challan_ids:
        pcs = db.query(PartyChallan).options(joinedload(PartyChallan.party)).filter(PartyChallan.id.in_(party_challan_ids)).all()
        party_challan_map = {p.id: p for p in pcs}

    formatted_transactions = []
    running_balance = opening_balance
    
    for tx in transactions:
        in_qty = float(tx.quantity) if tx.transaction_type == "IN" else 0.0
        out_qty = float(tx.quantity) if tx.transaction_type == "OUT" else 0.0
        
        party_match = True
        desc = tx.reference_type or "Adjustment"
        party_name = "-"
        ref_no = str(tx.reference_id)
        party_obj = None

        if tx.reference_type == "INVOICE":
             inv = invoice_map.get(tx.reference_id)
             if inv:
                 desc = f"Invoice"
                 ref_no = inv.invoice_number
                 party_obj = inv.party
                 party_name = inv.party.name if inv.party else "Unknown"
             else:
                 desc = f"Invoice #{tx.reference_id}"
                 
        elif tx.reference_type == "DELIVERY_CHALLAN":
             chal = challan_map.get(tx.reference_id)
             if chal:
                 desc = f"Return Challan"
                 ref_no = chal.challan_number
                 party_obj = chal.party
                 party_name = chal.party.name if chal.party else "Unknown"
             else:
                 desc = f"Return Challan #{tx.reference_id}"

        elif tx.reference_type == "PARTY_CHALLAN":
             pc = party_challan_map.get(tx.reference_id)
             if pc:
                 desc = f"Party Challan"
                 ref_no = pc.challan_number
                 party_obj = pc.party
                 party_name = pc.party.name if pc.party else "Unknown"
             else:
                 desc = f"Party Challan #{tx.reference_id}"

        if party_id:
            if not party_obj or party_obj.id != party_id:
                party_match = False

        if party_match:
            running_balance += (in_qty - out_qty)
            
            date_str = "-"
            if tx.created_at:
                try:
                    date_str = tx.created_at.strftime("%d-%m-%Y")
                except:
                    date_str = str(tx.created_at)

            formatted_transactions.append({
                "date": date_str,
                "type": tx.transaction_type,
                "ref": ref_no,
                "description": desc,
                "party_name": party_name,
                "in_qty": in_qty,
                "out_qty": out_qty,
                "balance": f"{running_balance:.2f}"
            })

    # Render
    template = env.get_template("stock_ledger_print.html")
    html_content = template.render(
        company=company,
        item=item,
        party=selected_party,
        start_date=start.strftime("%d-%m-%Y"),
        end_date=end.strftime("%d-%m-%Y"),
        opening_balance=f"{opening_balance:.2f}",
        current_stock=f"{running_balance:.2f}",
        transactions=formatted_transactions
    )
    
    # [MIGRATED] Generate via pdf_service (returns HTML bytes; browser handles print/save)
    pdf_data = await generate_pdf(html_content)
    
    safe_item_name = "".join([c if c.isalnum() or c in (' ', '-', '_') else '_' for c in item.name]).strip()
    filename = f"StockLedger_{safe_item_name}.pdf"
    
    return Response(
        content=pdf_data,
        media_type="text/html; charset=utf-8",
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )


# =========================================================
# 🆕 PUBLIC GST REPORT
# =========================================================
from app.models.invoice import Invoice
from app.core.security import verify_url_signature
from datetime import datetime
import base64
import io
import qrcode

@router.get("/gst/pdf")
async def public_gst_report_download(
    start_date: str,
    end_date: str,
    company_id: int,
    token: str,
    type: str = "gstr1",
    db: Session = Depends(get_db)
):
    """
    Public endpoint to download GST Report PDF.
    Verifies signature of company_id:start_date:end_date:type
    """
    
    # 1. Verify Signature
    data_to_sign = f"{company_id}:{start_date}:{end_date}:{type}"
    
    if not verify_url_signature(data_to_sign, token):
        raise HTTPException(status_code=403, detail="Invalid or expired link")
    
    # 2. Get Dates
    start = datetime.strptime(start_date, "%Y-%m-%d").date()
    end = datetime.strptime(end_date, "%Y-%m-%d").date()
    
    # 3. Get Company
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # 4. Fetch Data (Same logic as reports.py)
    # Totals
    total_taxable = 0
    total_sgst = 0
    total_cgst = 0
    total_igst = 0
    total_grand = 0

    # Group by Party
    grouped_data = {}

    if type == "gstr1":
        invoices = (
            db.query(Invoice)
            .options(joinedload(Invoice.party), joinedload(Invoice.items))
            .filter(
                Invoice.company_id == company_id,
                Invoice.invoice_date >= start,
                Invoice.invoice_date <= end,
                Invoice.status != "CANCELLED",
            )
            .order_by(Invoice.invoice_date.asc())
            .all()
        )

        for inv in invoices:
            party_name = inv.party.name if inv.party else "Unknown"
            gstin = inv.party.gst_number if inv.party else "-"
            party_key = f"{party_name} ({gstin})"

            if party_key not in grouped_data:
                grouped_data[party_key] = {
                    "party_name": party_name,
                    "gstin": gstin,
                    "invoices": [],
                    "sub_taxable": 0,
                    "sub_sgst": 0,
                    "sub_cgst": 0,
                    "sub_igst": 0,
                    "sub_total": 0
                }

            taxable_value = 0.0
            for item in inv.items:
                 taxable_value += float(item.amount)

            if hasattr(inv, 'sub_total') and inv.sub_total:
                 taxable_value = float(inv.sub_total)
            
            grand_total = float(inv.grand_total)
            total_tax = grand_total - taxable_value
            
            sgst = total_tax / 2
            cgst = total_tax / 2
            igst = 0.0

            grouped_data[party_key]["invoices"].append({
                "date": inv.invoice_date.strftime("%d-%m-%Y"),
                "invoice_number": inv.invoice_number,
                "taxable_value": taxable_value,
                "sgst": sgst,
                "cgst": cgst,
                "igst": igst,
                "total_amount": grand_total
            })

            grouped_data[party_key]["sub_taxable"] += taxable_value
            grouped_data[party_key]["sub_sgst"] += sgst
            grouped_data[party_key]["sub_cgst"] += cgst
            grouped_data[party_key]["sub_igst"] += igst
            grouped_data[party_key]["sub_total"] += grand_total

            total_taxable += taxable_value
            total_sgst += sgst
            total_cgst += cgst
            total_igst += igst
            total_grand += grand_total
            
    # Convert dict to sorted list
    report_data = sorted(grouped_data.values(), key=lambda x: x["party_name"])

    # Generate QR Code -> This itself contains the download link!
    # Recursive QR: Pointing to THIS URL (optional, or just plain text to avoid loop)
    # Let's keep it simple and just show text or same link.
    # Ideally, we verify signatures recursively? No, let's just use the current URL.
    
    from app.core.config import get_backend_url
    base_url = get_backend_url()
    current_url = f"{base_url}/public/reports/gst/pdf?start_date={start_date}&end_date={end_date}&type={type}&company_id={company_id}&token={token}"
    
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(current_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    qr_code_base64 = base64.b64encode(buffered.getvalue()).decode()

    # 5. Render Template
    template = env.get_template("gst_report.html")
    
    html_content = template.render(
        company=company,
        start_date=start.strftime('%d-%m-%Y'),
        end_date=end.strftime('%d-%m-%Y'),
        generation_date=datetime.now().strftime("%d-%m-%Y %H:%M"),
        grouped_data=report_data,
        total_taxable=total_taxable,
        total_sgst=total_sgst,
        total_cgst=total_cgst,
        total_igst=total_igst,
        total_amount=total_grand,
        qr_code=qr_code_base64
    )

    # [MIGRATED] Generate via pdf_service (returns HTML bytes; browser handles print/save)
    pdf_data = await generate_pdf(html_content)
    
    filename = f"GST_Report_{start.strftime('%d%m%y')}_{end.strftime('%d%m%y')}.pdf"
    
    return Response(
        content=pdf_data,
        media_type="text/html; charset=utf-8",
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )


@router.get("/job-work-stock-summary")
async def public_job_work_stock_summary(
    company_id: int,
    start: str,
    end: str,
    party_name: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Public endpoint to view / verify Job Work Stock Summary by scanning QR code.
    """
    try:
        start_dt = datetime.strptime(start, "%Y-%m-%d").date()
    except Exception:
        start_dt = datetime.now().date()
    try:
        end_dt = datetime.strptime(end, "%Y-%m-%d").date()
    except Exception:
        end_dt = datetime.now().date()

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        class MockCompany:
            name = "Company"
            address = ""
            gst_number = ""
            phone = ""
        company = MockCompany()

    inwards = db.query(PartyChallanItem).join(PartyChallan).filter(
        PartyChallan.company_id == company_id,
        PartyChallan.status != "cancelled"
    ).all()

    outwards = db.query(DeliveryChallanItem).join(DeliveryChallan).options(
        joinedload(DeliveryChallanItem.challan),
        joinedload(DeliveryChallanItem.party_challan_item).joinedload(PartyChallanItem.party_challan).joinedload(PartyChallan.party),
        joinedload(DeliveryChallanItem.party_challan_item).joinedload(PartyChallanItem.item)
    ).filter(
        DeliveryChallan.company_id == company_id,
        DeliveryChallan.status != "cancelled"
    ).all()

    stock_map = {}
    def get_key(party_id, item_id):
        return (party_id, item_id)

    for row in inwards:
        if not row.party_challan or not row.item:
            continue
        key = get_key(row.party_challan.party_id, row.item_id)
        if key not in stock_map:
            stock_map[key] = {
                "party_name": row.party_challan.party.name if (row.party_challan and row.party_challan.party) else "Unknown",
                "gstin": row.party_challan.party.gst_number if (row.party_challan and row.party_challan.party and row.party_challan.party.gst_number) else "",
                "item_name": row.item.name if row.item else "Unknown",
                "opening": 0.0,
                "inward": 0.0,
                "outward": 0.0,
                "closing": 0.0
            }
        qty = float(row.quantity_ordered or 0)
        t_date = row.party_challan.challan_date
        if t_date:
            if hasattr(t_date, "date"): t_date = t_date.date()
            if isinstance(t_date, str):
                try: t_date = datetime.strptime(t_date[:10], "%Y-%m-%d").date()
                except: pass
            if t_date < start_dt:
                stock_map[key]["opening"] += qty
            elif start_dt <= t_date <= end_dt:
                stock_map[key]["inward"] += qty

    for row in outwards:
        if not row.party_challan_item:
            continue
        pc_item = row.party_challan_item
        if not pc_item.party_challan or not pc_item.item:
            continue
        key = get_key(pc_item.party_challan.party_id, pc_item.item_id)
        if key not in stock_map:
            stock_map[key] = {
                "party_name": pc_item.party_challan.party.name if (pc_item.party_challan and pc_item.party_challan.party) else "Unknown",
                "gstin": pc_item.party_challan.party.gst_number if (pc_item.party_challan and pc_item.party_challan.party and pc_item.party_challan.party.gst_number) else "",
                "item_name": pc_item.item.name if pc_item.item else "Unknown",
                "opening": 0.0,
                "inward": 0.0,
                "outward": 0.0,
                "closing": 0.0
            }
        qty = float(row.quantity or 0)
        if not row.challan:
            continue
        t_date = row.challan.challan_date
        if t_date:
            if hasattr(t_date, "date"): t_date = t_date.date()
            if isinstance(t_date, str):
                try: t_date = datetime.strptime(t_date[:10], "%Y-%m-%d").date()
                except: pass
            if t_date < start_dt:
                stock_map[key]["opening"] -= qty
            elif start_dt <= t_date <= end_dt:
                stock_map[key]["outward"] += qty

    stock_data = []
    clean_party = party_name.strip().lower() if (party_name and isinstance(party_name, str)) else None
    if clean_party in ["all", "all parties", "undefined", "null", "none", ""]:
        clean_party = None

    for k, v in stock_map.items():
        v["closing"] = v["opening"] + v["inward"] - v["outward"]
        item_party = (v.get("party_name") or "").strip().lower()
        if clean_party and item_party != clean_party:
            continue
        if abs(v["opening"]) > 0 or v["inward"] > 0 or v["outward"] > 0 or abs(v["closing"]) > 0:
            stock_data.append(v)

    grouped_stock = {}
    for item in stock_data:
        pname = item.get("party_name") or "Unknown"
        if pname not in grouped_stock:
            grouped_stock[pname] = {
                "party_name": pname,
                "gstin": item.get("gstin") or "",
                "item_list": [],
                "sub_opening": 0.0,
                "sub_inward": 0.0,
                "sub_outward": 0.0,
                "sub_closing": 0.0
            }
        grouped_stock[pname]["item_list"].append(item)
        grouped_stock[pname]["sub_opening"] += item.get("opening", 0.0)
        grouped_stock[pname]["sub_inward"] += item.get("inward", 0.0)
        grouped_stock[pname]["sub_outward"] += item.get("outward", 0.0)
        grouped_stock[pname]["sub_closing"] += item.get("closing", 0.0)

    grouped_list = list(grouped_stock.values())

    total_opening = sum(item['opening'] for item in stock_data)
    total_inward = sum(item['inward'] for item in stock_data)
    total_outward = sum(item['outward'] for item in stock_data)
    total_closing = sum(item['closing'] for item in stock_data)

    from app.core.config import get_backend_url
    base_url = get_backend_url()
    p_param = f"&party_name={party_name}" if party_name else ""
    current_url = f"{base_url}/public/reports/job-work-stock-summary?company_id={company_id}&start={start}&end={end}{p_param}"

    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(current_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    qr_code_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

    template = env.get_template("job_work_stock_summary.html")
    html_content = template.render({
        "request": {},
        "grouped_stock": grouped_list,
        "stock_data": stock_data,
        "company": company,
        "party_name": party_name,
        "start_date": start_dt.strftime("%d/%m/%Y"),
        "end_date": end_dt.strftime("%d/%m/%Y"),
        "generation_date": datetime.now().strftime("%d/%m/%Y %I:%M %p"),
        "total_opening": total_opening,
        "total_inward": total_inward,
        "total_outward": total_outward,
        "total_closing": total_closing,
        "qr_code": qr_code_b64
    })

    return Response(
        content=html_content,
        media_type="text/html; charset=utf-8",
        headers={"Content-Disposition": "inline; filename=Job_Work_Stock_Summary.html"}
    )


@router.get("/grn-report")
async def public_grn_report(
    company_id: int,
    start: str,
    end: str,
    party_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Public endpoint to view / verify GRN Report by scanning QR code.
    """
    try:
        start_dt = datetime.strptime(start, "%Y-%m-%d").date()
    except Exception:
        start_dt = datetime.now().date()
    try:
        end_dt = datetime.strptime(end, "%Y-%m-%d").date()
    except Exception:
        end_dt = datetime.now().date()

    query = db.query(InvoiceItem).join(Invoice).join(Party).join(Item).outerjoin(DeliveryChallanItem).outerjoin(DeliveryChallan).filter(
        Invoice.company_id == company_id,
        Invoice.invoice_date >= start_dt,
        Invoice.invoice_date <= end_dt,
        Invoice.status != "CANCELLED"
    )

    party_name = None
    if party_id:
        query = query.filter(Invoice.party_id == party_id)
        party = db.query(Party).filter(Party.id == party_id).first()
        if party:
            party_name = party.name

    items = query.order_by(Item.name.asc(), Invoice.invoice_date.desc()).all()

    grouped_data = {}
    total_qty = 0
    total_amount = 0

    for item in items:
        qty = float(item.quantity) if item.quantity else 0
        amt = float(item.amount) if item.amount else 0
        total_qty += qty
        total_amount += amt

        challan_no = "-"
        if item.delivery_challan_item and item.delivery_challan_item.challan:
             challan_no = item.delivery_challan_item.challan.challan_number

        item_data = {
            "invoice_number": item.invoice.invoice_number,
            "invoice_date": item.invoice.invoice_date,
            "party_name": item.invoice.party.name,
            "grn_no": item.grn_no,
            "challan_no": challan_no,
            "quantity": qty,
            "rate": float(item.rate) if item.rate else 0,
            "amount": amt
        }

        item_name = item.item.name
        if item_name not in grouped_data:
            grouped_data[item_name] = {
                "item_list": [],
                "total_qty": 0,
                "total_amount": 0
            }

        grouped_data[item_name]["item_list"].append(item_data)
        grouped_data[item_name]["total_qty"] += qty
        grouped_data[item_name]["total_amount"] += amt

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        class MockCompany:
            name = "Company"
            address = ""
            gst_number = ""
            phone = ""
        company = MockCompany()

    from app.core.config import get_backend_url
    base_url = get_backend_url()
    p_param = f"&party_id={party_id}" if party_id else ""
    current_url = f"{base_url}/public/reports/grn-report?company_id={company_id}&start={start}&end={end}{p_param}"

    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(current_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    qr_code_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

    template = env.get_template("grn_report.html")
    html_content = template.render({
        "company": company,
        "grouped_items": grouped_data,
        "start_date": start_dt.strftime("%d/%m/%Y"),
        "end_date": end_dt.strftime("%d/%m/%Y"),
        "party_name": party_name,
        "grand_total_qty": total_qty,
        "grand_total_amount": total_amount,
        "generation_date": datetime.now().strftime("%d/%m/%Y %I:%M %p"),
        "qr_code": qr_code_b64
    })

    return Response(
        content=html_content,
        media_type="text/html; charset=utf-8",
        headers={"Content-Disposition": "inline; filename=GRN_Report.html"}
    )
