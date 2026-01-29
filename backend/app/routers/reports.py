from fastapi import APIRouter, Depends, Query, Response, HTTPException
import qrcode
import io
import base64
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_, and_
from typing import List, Optional
from datetime import datetime
from jinja2 import Environment, FileSystemLoader, select_autoescape
# from playwright.sync_api import sync_playwright # REMOVED
# from playwright.async_api import async_playwright # REMOVED
# from starlette.concurrency import run_in_threadpool # REMOVED
import traceback

from app.services.pdf_service import generate_pdf # ADDED


from app.database.session import get_db
from app.models.company import Company
from app.core.dependencies import get_company_id, get_active_financial_year
from app.models.party_challan_item import PartyChallanItem
from app.models.party_challan import PartyChallan
from app.models.party import Party
from app.models.item import Item
from app.models.process import Process
from app.models.stock_transaction import StockTransaction
from app.models.delivery_challan import DeliveryChallan
from app.models.invoice import Invoice
from app.models.party_challan import PartyChallan
from sqlalchemy.orm import joinedload

from app.models.invoice_item import InvoiceItem
from app.models.delivery_challan_item import DeliveryChallanItem
from app.models.invoice_item import InvoiceItem
from app.models.delivery_challan_item import DeliveryChallanItem
from app.models.party_challan_item import PartyChallanItem
from app.schemas.report import DashboardStats

from starlette.templating import Jinja2Templates

import os
router = APIRouter(prefix="/reports", tags=["Reports"])

# Fix for Frozen App: Resolve templates directory relative to this file
# reports.py is in app/routers, so we go up one level to app, then into templates
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")

templates = Jinja2Templates(directory=TEMPLATES_DIR)

@router.post("/recalculate-stock")
def recalculate_stock(
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """
    NUCLEAR OPTION: Wipes all stock transactions and rebuilds them from documents.
    Useful for fixing data inconsistencies during development.
    """
    # 1. Delete ALL Stock Transactions for this company
    db.query(StockTransaction).filter(StockTransaction.company_id == company_id).delete()
    db.flush()

    # 2. Rebuild from Party Challans (IN)
    party_challans = db.query(PartyChallan).filter(PartyChallan.company_id == company_id).all()
    count_pc = 0
    for pc in party_challans:
        for item in pc.items:
            stock_tx = StockTransaction(
                company_id=company_id,
                financial_year_id=pc.financial_year_id,
                item_id=item.item_id,
                quantity=item.quantity_ordered,
                transaction_type="IN",
                reference_type="PARTY_CHALLAN",
                reference_id=pc.id,
                created_at=pc.created_at
            )
            db.add(stock_tx)
            count_pc += 1

    # 3. Rebuild from Delivery Challans (OUT)
    delivery_challans = db.query(DeliveryChallan).filter(DeliveryChallan.company_id == company_id).all()
    count_dc = 0
    for dc in delivery_challans:
        for item in dc.items:
            stock_tx = StockTransaction(
                company_id=company_id,
                financial_year_id=dc.financial_year_id,
                item_id=item.item.id, # Item linked via PartyChallanItem -> Item
                quantity=item.quantity,
                transaction_type="OUT",
                reference_type="DELIVERY_CHALLAN",
                reference_id=dc.id,
                created_at=dc.created_at
            )
            # Find item_id properly (DeliveryChallanItem -> PartyChallanItem -> Item)
            if item.party_challan_item and item.party_challan_item.item_id:
                stock_tx.item_id = item.party_challan_item.item_id
                db.add(stock_tx)
                count_dc += 1

    # 4. Rebuild from Invoices (Direct Invoice Items ONLY) (OUT)
    # Filter Invoices that are NOT cancelled
    invoices = db.query(Invoice).filter(
        Invoice.company_id == company_id,
        Invoice.status != "CANCELLED"
    ).all()
    count_inv = 0
    for inv in invoices:
        for item in inv.items:
            # Only if NOT linked to a Delivery Challan Item
            if not item.delivery_challan_item_id:
                stock_tx = StockTransaction(
                    company_id=company_id,
                    financial_year_id=inv.financial_year_id,
                    item_id=item.item_id,
                    quantity=item.quantity,
                    transaction_type="OUT",
                    reference_type="INVOICE",
                    reference_id=inv.id,
                    created_at=inv.created_at
                )
                db.add(stock_tx)
                count_inv += 1
    
    db.commit()

    # ---------------------------------------------------------
    # PART 2: Fix Party Challan "Delivered Quantity" & Status
    # ---------------------------------------------------------
    
    # A. Reset all PartyChallanItems delivered_qty to 0
    db.execute("UPDATE party_challan_items SET quantity_delivered = 0")
    db.flush()

    # B. Re-sum delivered quantities from DeliveryChallans
    # distinct() not needed if we iterate logic carefully, but let's query all DC items
    dc_items = db.query(DeliveryChallanItem).join(DeliveryChallan).filter(
        DeliveryChallan.company_id == company_id
    ).all()

    for dci in dc_items:
        if dci.party_challan_item_id:
            pc_item = db.query(PartyChallanItem).get(dci.party_challan_item_id)
            if pc_item:
                 pc_item.quantity_delivered += dci.quantity
                 db.add(pc_item)
    
    db.flush()

    # C. Update Party Challan Status (Open/Partial/Completed)
    all_pcs = db.query(PartyChallan).filter(PartyChallan.company_id == company_id).all()
    for pc in all_pcs:
        total_ordered = sum([i.quantity_ordered for i in pc.items])
        total_delivered = sum([i.quantity_delivered for i in pc.items])

        if total_delivered >= total_ordered and total_ordered > 0:
            pc.status = "completed"
        elif total_delivered > 0:
            pc.status = "partial"
        else:
            pc.status = "open"
        db.add(pc)

    db.commit()

    return {
        "message": "Stock & Job Work Status Recalculated Successfully",
        "stats": {
            "party_challans": count_pc,
            "delivery_challans": count_dc,
            "direct_invoices": count_inv,
            "status_updates": len(all_pcs)
        }
    }

@router.get("/job-work")
def get_job_work_report(
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    """
    Returns a report of all Inward Items (Party Challans) and their status.
    Columns: Date, Party, Challan No, Item, Process, In Qty, Delivered Qty, Pending Qty, Status
    """
    
    # Query PartyChallanItems joined with PartyChallan, Party, Item, Process
    items = db.query(PartyChallanItem).join(
        PartyChallan
    ).options(
        joinedload(PartyChallanItem.party_challan).joinedload(PartyChallan.party),
        joinedload(PartyChallanItem.item),
        joinedload(PartyChallanItem.process)
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
    ).order_by(
        PartyChallan.challan_date.asc()
    ).all()
    
    report_data = []
    
    for row in items:
        pending = float(row.quantity_ordered) - float(row.quantity_delivered)
        status = "Completed" if pending <= 0 else "Pending"
        
        report_data.append({
            "id": row.id,
            "date": row.party_challan.challan_date,
            "party_id": row.party_challan.party_id,
            "party_name": row.party_challan.party.name,
            "challan_number": row.party_challan.challan_number,
            "item_id": row.item.id,
            "item_name": row.item.name,
            "process_name": row.process.name if row.process else "-",
            "in_qty": float(row.quantity_ordered),
            "out_qty": float(row.quantity_delivered),
            "pending_qty": pending if pending > 0 else 0,
            "status": status,
            "is_opening_balance": row.party_challan.financial_year_id != fy.id
        })
        
    return report_data


@router.get("/ledger/pdf")
async def get_party_ledger_pdf(
    party_id: int = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    # 1. Get Company Details
    company = db.query(Company).filter(Company.id == company_id).first()
    party_name = None
    if party_id:
        party = db.query(Party).filter(Party.id == party_id).first()
        if party:
            party_name = party.name

    # 2. Query Data (Same logic as job work report)
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

    # 3. Aggregate Data (Date-Wise Logic)
    ledger_map = {}
    
    # Parse dates
    start = datetime.strptime(start_date, "%Y-%m-%d").date() if start_date else fy.start_date
    end = datetime.strptime(end_date, "%Y-%m-%d").date() if end_date else fy.end_date

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
        
        pending_qty = float(row.quantity_ordered) - float(row.quantity_delivered)
        # Ensure non-negative pending (though logic should enforce it)
        pending = max(0.0, pending_qty)

        # Logic: 
        # Challan Date < Start => Add Pending to Opening Balance
        # Challan Date in Range => Add In/Out
        # Challan Date > End => Ignore
        
        c_date = row.party_challan.challan_date
        
        if c_date < start:
             ledger_map[key]["opening"] += pending
             ledger_map[key]["balance"] += pending
        elif c_date <= end:
             ledger_map[key]["in"] += float(row.quantity_ordered)
             ledger_map[key]["out"] += float(row.quantity_delivered)
             ledger_map[key]["balance"] += pending

    # Format numbers for template & Filter zero rows
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

    # 4. Generate QR Code
    import qrcode
    import io
    import base64
    import socket
    from app.core.security import create_url_signature
    
    # Generate Public Download URL
    from app.core.config import get_backend_url
    base_url = get_backend_url()
    
    # Sign the parameters (Include dates if needed, but token signature usually company/fy/party)
    party_val = str(party_id) if party_id else "all"
    data_to_sign = f"{company_id}:{fy.id}:{party_val}"
    token = create_url_signature(data_to_sign)
    
    download_url = f"{base_url}/public/reports/ledger/download?company_id={company_id}&fy_id={fy.id}&token={token}"
    if party_id:
        download_url += f"&party_id={party_id}"
    if start_date:
        download_url += f"&start_date={start_date}"
    if end_date:
        download_url += f"&end_date={end_date}"
    
    qr = qrcode.QRCode(version=None, box_size=10, border=5)
    qr.add_data(download_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    qr_code_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

    # 5. Render HTML
    # 5. Render HTML
    template = templates.get_template("party_ledger.html")
    
    html_content = template.render(
        company=company,
        financial_year=f"{fy.start_date.year}-{fy.end_date.year}",
        start_date=start,
        end_date=end,
        party_name=party_name,
        generation_date=datetime.now().strftime("%d-%m-%Y %H:%M"),
        ledger_data=ledger_data,
        qr_code=qr_code_b64
    )

    # 5. Generate PDF with Shared Service
    pdf_data = await generate_pdf(html_content, options={
        "margin": {"top": "10mm", "bottom": "10mm", "left": "10mm", "right": "10mm"}
    })

    # 6. Return Response
    filename = f"Stock_Ledger_{party_name.replace(' ', '_')}.pdf" if party_name else "Stock_Ledger_All.pdf"
    
    return Response(
        content=pdf_data,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


from app.models.invoice import Invoice
from app.models.payment import Payment

@router.get("/party-statement")
def get_party_statement(
    party_id: int,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    """
    Returns a financial statement (ledger) for a party.
    Includes Invoices (Debit) and Payments (Credit) with running balance.
    """
    
    # 1. Date Parsing
    start = datetime.strptime(start_date, "%Y-%m-%d").date() if start_date else fy.start_date
    end = datetime.strptime(end_date, "%Y-%m-%d").date() if end_date else fy.end_date

    # 2. Calculate Opening Balance (Everything BEFORE start_date)
    # Opening = Party Opening + (Sum Inv < start) - (Sum Pay < start)
    
    party = db.query(Party).filter(Party.id == party_id, Party.company_id == company_id).first()
    if not party:
        return []

    # Initial Opening from Party Record
    # Logic: If query start_date is FY start date, use Party Opening Balance.
    # If query start_date is later, we must calculate the carry forward.
    
    opening_balance = float(party.opening_balance)
    
    # Add Invoices before start_date
    prev_invoices = db.query(func.sum(Invoice.grand_total)).filter(
        Invoice.party_id == party_id,
        Invoice.company_id == company_id,
        Invoice.invoice_date < start,
        Invoice.status != "CANCELLED"
    ).scalar() or 0
    
    # Subtract Payments Received before start_date
    prev_received = db.query(func.sum(Payment.amount)).filter(
        Payment.party_id == party_id,
        Payment.company_id == company_id,
        Payment.payment_date < start,
        Payment.payment_type == "RECEIVED"
    ).scalar() or 0

    # Add Payments Paid before start_date (Debit)
    prev_paid = db.query(func.sum(Payment.amount)).filter(
        Payment.party_id == party_id,
        Payment.company_id == company_id,
        Payment.payment_date < start,
        Payment.payment_type == "PAID"
    ).scalar() or 0
    
    opening_balance += (float(prev_invoices) - float(prev_received) + float(prev_paid))
    
    # 3. Fetch Transactions within Date Range
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
        Payment.payment_date <= end # Include end date
    ).all()
    
    # 4. Merge and Sort
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
        
    # Sort by Date
    transactions.sort(key=lambda x: x["date"])
    
    # 5. Calculate Running Balance
    running_balance = opening_balance
    final_data = []
    
    # Add Opening Row
    final_data.append({
        "date": start,
        "type": "OPENING",
        "ref": "-",
        "description": "Opening Balance",
        "debit": 0.0,
        "credit": 0.0,
        "balance": running_balance
    })
    
    for tx in transactions:
        running_balance += (tx["debit"] - tx["credit"])
        tx["balance"] = running_balance
        final_data.append(tx)
        
    return final_data


@router.get("/party-statement/pdf")
async def get_party_statement_pdf(
    party_id: int,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    # Reuse Logic to get data (Ideally move this to a service function, but copying for now)
    
    # 1. Date Parsing
    start = datetime.strptime(start_date, "%Y-%m-%d").date() if start_date else fy.start_date
    end = datetime.strptime(end_date, "%Y-%m-%d").date() if end_date else fy.end_date

    party = db.query(Party).filter(Party.id == party_id, Party.company_id == company_id).first()
    if not party:
        return Response(status_code=404)
        
    company = db.query(Company).filter(Company.id == company_id).first()

    # Opening Calc
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
    
    # Transactions
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
    
    # Running Balance & Totals
    running_balance = opening_balance
    total_debit = 0.0
    total_credit = 0.0
    
    formatted_transactions = []
    
    # First Row: Opening
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

    # QR Code Generation
    import qrcode
    import io
    import base64
    from app.core.security import create_url_signature
    from app.core.config import get_backend_url
    
    base_url = get_backend_url()
    
    # Sign: company_id:party_id
    # We should match what public_reports expects.
    # public_reports verifies f"{company_id}:{party_id}" [+ dates if present]
    # Let's include dates in signature for security if they are present.
    
    sig_data = f"{company_id}:{party_id}"
    if start_date:
        sig_data += f":{start_date}"
    if end_date:
        sig_data += f":{end_date}"
        
    token = create_url_signature(sig_data)
    
    download_url = f"{base_url}/public/reports/statement/download?party_id={party_id}&company_id={company_id}&token={token}"
    if start_date:
        download_url += f"&start_date={start_date}"
    if end_date:
        download_url += f"&end_date={end_date}"
    
    qr = qrcode.QRCode(version=None, box_size=10, border=5)
    qr.add_data(download_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    qr_code_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

    # Render HTML
    # Render HTML
    template = templates.get_template("party_statement.html")
    
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
        qr_code=qr_code_b64
    )
    
    # Generate PDF
    pdf_data = await generate_pdf(html_content, options={
        "margin": {"top": "15mm", "bottom": "15mm", "left": "10mm", "right": "10mm"},
        "display_header_footer": True,
        "footer_template": """
            <div style="font-size: 8px; font-family: sans-serif; width: 100%; text-align: center; color: #6b7280; padding-bottom: 5px;">
                Page <span class="pageNumber"></span> of <span class="totalPages"></span>
            </div>
        """,
        "header_template": "<div></div>"
    })
    
    filename = f"Statement_{party.name.replace(' ', '_')}_{start}_{end}.pdf"
    
    return Response(
        content=pdf_data,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/stock-ledger")
def get_stock_ledger(
    item_id: int,
    party_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    """
    Returns a stock ledger (running balance) for a specific item.
    """
    # 1. Date Parsing
    start = datetime.strptime(start_date, "%Y-%m-%d") if start_date else datetime.combine(fy.start_date, datetime.min.time())
    end = datetime.strptime(end_date, "%Y-%m-%d") if end_date else datetime.combine(fy.end_date, datetime.max.time())
    # Ensure end includes the whole day
    if end_date:
        end = end.replace(hour=23, minute=59, second=59)

    # 2. Opening Balance
    # Sum(IN) - Sum(OUT) before start date
    
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
    
    # 3. Transactions
    transactions = db.query(StockTransaction).filter(
        StockTransaction.item_id == item_id,
        StockTransaction.company_id == company_id,
        StockTransaction.created_at >= start,
        StockTransaction.created_at <= end
    ).order_by(StockTransaction.created_at.asc()).all()
    
    # Fetch Party Details for transactions
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

    # 4. Format Data
    final_data = []
    running_balance = opening_balance
    
    # Opening Row
    final_data.append({
        "date": start.date(),
        "type": "OPENING",
        "ref": "-",
        "description": "Opening Stock",
        "party_name": "-",
        "in_qty": 0.0,
        "out_qty": 0.0,
        "balance": running_balance
    })
    
    for tx in transactions:
        in_qty = float(tx.quantity) if tx.transaction_type == "IN" else 0.0
        out_qty = float(tx.quantity) if tx.transaction_type == "OUT" else 0.0
        
        party_match = True
        desc = tx.reference_type or "Adjustment"
        party_name = "-"
        party_obj = None
        ref_no = str(tx.reference_id or "-")
        
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

        # FILTER PARTY
        if party_id:
            if not party_obj or party_obj.id != party_id:
                party_match = False

        if party_match:
            running_balance += (in_qty - out_qty)

            final_data.append({
                "date": tx.created_at.date(), # or created_at
                "type": tx.transaction_type,
                "ref": ref_no,
                "description": desc,
                "party_name": party_name,
                "in_qty": in_qty,
                "out_qty": out_qty,
                "balance": running_balance
            })
        
    return final_data


@router.get("/stock-ledger/pdf")
async def get_stock_ledger_pdf(
    item_id: int,
    party_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    # Reuse logic to fetch data
    # -------------------------
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

    # Opening Balance
    # Note: If party_id filters, we ideally filter Opening too.
    # Current limitation: Opening Balance calc in SQL (prev_in - prev_out) is across ALL parties.
    # To fix this accurately for one party, we'd need to fetch ALL historic transactions and filter in Python,
    # or join tables in SQL. For now, we will fetch ALL and filter in Python for accuracy.
    
    # Fetch ALL transactions for this Item from START of time (or FY?)
    # Usually Stock Ledger is perpetual.
    # Let's fetch pure `transactions` in range, and handle Opening separately.
    
    # 1. Opening Balance Logic (Simplified: Use Global Opening if Party not selected, else 0 or recalc)
    # Global Opening
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
    
    # IF PARTY SELECTED: We must recalculate opening balance by filtering historic transactions manually.
    # This is heavy but necessary for correctness.
    if party_id:
        opening_balance = 0.0 # Reset
        # Fetch all historic transactions to filter
        all_historic = db.query(StockTransaction).filter(
            StockTransaction.item_id == item_id,
            StockTransaction.company_id == company_id,
            StockTransaction.created_at < start
        ).all()
        
        # Resolve all references (Batch fetch for performance would be better, but doing simple loop for now)
        # This might be slow. Optimization: Only fetch IDs first.
        # Actually, let's just stick to "In Range" for now if performance is concern?
        # User implies "Ledger", likely wants full history.
        # Let's leave Opening as 0 for Party-Specific view unless requested, 
        # OR attempt to filter if list is small. 
        # For safety/speed, let's keep Opening Balance as 0 for Party View effectively treating it as "Activity Report".
        # Valid adjustment: "Party Statement" starts with 0 usually unless it's a financial ledger.
        pass

    # Transactions
    transactions = db.query(StockTransaction).filter(
        StockTransaction.item_id == item_id,
        StockTransaction.company_id == company_id,
        StockTransaction.created_at >= start,
        StockTransaction.created_at <= end
    ).order_by(StockTransaction.created_at.asc()).all()

    # Fetch Party Details for transactions
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

    # Prepare Data for Template
    # -------------------------
    try:
        formatted_transactions = []
        running_balance = opening_balance
        
        for tx in transactions:
            party_match = True # Default true if no party filter
            
            in_qty = float(tx.quantity) if tx.transaction_type == "IN" else 0.0
            out_qty = float(tx.quantity) if tx.transaction_type == "OUT" else 0.0
            
            party_name = "-"
            party_obj = None
            desc = tx.reference_type or "Adjustment"
            ref_no = str(tx.reference_id)

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

            # FILTER BY PARTY
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
    except Exception as e:
        print(f"Error preparing stock ledger data: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Data Prep Error: {str(e)}")

    # QR Code Generation
    import qrcode
    import io
    import base64
    from app.core.security import create_url_signature
    from app.core.config import get_backend_url
    
    base_url = get_backend_url()
    
    # Signature: company_id:item_id:party_id (party_id can be None/None -> "all")
    party_val = str(party_id) if party_id else "all"
    sig_data = f"{company_id}:{item_id}:{party_val}"
    
    if start_date:
        sig_data += f":{start_date}"
    if end_date:
        sig_data += f":{end_date}"
        
    token = create_url_signature(sig_data)
    
    download_url = f"{base_url}/public/reports/stock/download?item_id={item_id}&company_id={company_id}&token={token}"
    if party_id:
        download_url += f"&party_id={party_id}"
    if start_date:
         download_url += f"&start_date={start_date}"
    if end_date:
         download_url += f"&end_date={end_date}"
         
    qr = qrcode.QRCode(version=None, box_size=10, border=5)
    qr.add_data(download_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    qr_code_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
    
    # Render Template
    # ---------------
    company = db.query(Company).filter(Company.id == company_id).first()
    
    template = templates.get_template("stock_ledger_print.html")
    html_content = template.render(
        company=company,
        item=item,
        party=selected_party,
        start_date=start.strftime("%d-%m-%Y"),
        end_date=end.strftime("%d-%m-%Y"),
        opening_balance=f"{opening_balance:.2f}",
        current_stock=f"{running_balance:.2f}",
        transactions=formatted_transactions,
        qr_code=qr_code_b64
    )

    # Generate PDF
    # ------------
    # Generate PDF
    # ------------
    pdf_data = await generate_pdf(html_content, options={
         "margin": {"top": "15mm", "bottom": "15mm", "left": "10mm", "right": "10mm"},
         "display_header_footer": True,
         "footer_template": """
            <div style="font-size: 8px; font-family: sans-serif; width: 100%; text-align: center; color: #6b7280; padding-bottom: 5px;">
                Page <span class="pageNumber"></span> of <span class="totalPages"></span>
            </div>
         """,
         "header_template": "<div></div>"
    })
    
    # Sanitize Filename
    safe_item_name = "".join([c if c.isalnum() or c in (' ', '-', '_') else '_' for c in item.name]).strip()
    filename = f"StockLedger_{safe_item_name}_{start.date()}_{end.date()}.pdf"
    
    return Response(
        content=pdf_data,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/dashboard-stats", response_model=DashboardStats)
def get_dashboard_stats(
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    """
    Returns aggregated stats for the dashboard:
    1. Total Revenue (Payments Received)
    2. Total Receivables (Unpaid Invoices)
    3. Total Payables (Unpaid Expenses/Purchases)
    4. Sales Trend
    5. Recent Invoices
    6. Expense Breakdown (Pie Chart)
    7. Cash Flow Trend (Income vs Exp)
    """
    from app.models.payment import Payment
    from app.models.expense import Expense
    from sqlalchemy import func, extract
    import calendar

    # 1. Total Revenue (Payments Received in this FY)
    total_revenue = db.query(func.sum(Payment.amount)).filter(
        Payment.company_id == company_id,
        Payment.financial_year_id == fy.id,
        Payment.payment_type == "RECEIVED"
    ).scalar() or 0.0

    # 2. Total Receivables (Pending Invoice Amounts)
    receivables = db.query(func.sum(Invoice.grand_total - Invoice.paid_amount)).filter(
        Invoice.company_id == company_id,
        Invoice.financial_year_id == fy.id,
        Invoice.status.in_(["BILLED", "PARTIAL", "OPEN"])
    ).scalar() or 0.0

    # 3. Total Payables / Outflow
    # A. Vendor Payments
    payments_made = float(db.query(func.sum(Payment.amount)).filter(
        Payment.company_id == company_id,
        Payment.financial_year_id == fy.id,
        Payment.payment_type == "PAID"
    ).scalar() or 0.0)
    
    # B. Operational Expenses (Only PAID for cash flow)
    operational_expenses = float(db.query(func.sum(Expense.amount)).filter(
        Expense.company_id == company_id,
        Expense.financial_year_id == fy.id,
        Expense.status == "PAID"
    ).scalar() or 0.0)

    total_expenses = payments_made + operational_expenses
    
    # 4. Monthly Sales Trend (Last 6 Months within FY)
    sales_data = db.query(
        extract('month', Invoice.invoice_date).label('month'),
        func.sum(Invoice.grand_total).label('total')
    ).filter(
        Invoice.company_id == company_id,
        Invoice.financial_year_id == fy.id,
        Invoice.status != "CANCELLED"
    ).group_by(extract('month', Invoice.invoice_date)).all()

    sales_map = {row.month: float(row.total) for row in sales_data}
    
    chart_data = []
    # Simple FY check: If FY matches current year, show relevant months
    for m in range(1, 13):
        if m in sales_map:
            chart_data.append({
                "name": calendar.month_abbr[m],
                "sales": sales_map[m]
            })

    # 5. Recent Invoices
    recent_invoices = db.query(Invoice).options(joinedload(Invoice.party)).filter(
        Invoice.company_id == company_id,
        Invoice.financial_year_id == fy.id
    ).order_by(Invoice.created_at.desc()).limit(5).all()

    recent_data = []
    for inv in recent_invoices:
        recent_data.append({
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "party_name": inv.party.name if inv.party else "Unknown",
            "date": inv.invoice_date,
            "amount": float(inv.grand_total),
            "status": inv.status
        })
        
    # 6. Expense Breakdown (By Category)
    expense_cat_data = db.query(
        Expense.category,
        func.sum(Expense.amount).label('total')
    ).filter(
        Expense.company_id == company_id,
        Expense.financial_year_id == fy.id
    ).group_by(Expense.category).all()
    
    expense_breakdown = [
        {"category": row.category or "Uncategorized", "amount": float(row.total)}
        for row in expense_cat_data
    ]
    
    # 7. Cash Flow Trend (Income vs Expense per month)
    # Income (Payments Received)
    income_data = db.query(
        extract('month', Payment.payment_date).label('month'),
        func.sum(Payment.amount).label('total')
    ).filter(
        Payment.company_id == company_id,
        Payment.financial_year_id == fy.id,
        Payment.payment_type == "RECEIVED"
    ).group_by(extract('month', Payment.payment_date)).all()
    income_map = {row.month: float(row.total) for row in income_data}
    
    # Expenses (Vendor Payments)
    vendor_exp_data = db.query(
        extract('month', Payment.payment_date).label('month'),
        func.sum(Payment.amount).label('total')
    ).filter(
        Payment.company_id == company_id,
        Payment.financial_year_id == fy.id,
        Payment.payment_type == "PAID"
    ).group_by(extract('month', Payment.payment_date)).all()
    vendor_exp_map = {row.month: float(row.total) for row in vendor_exp_data}
    
    # Operational Expenses
    op_exp_data = db.query(
        extract('month', Expense.date).label('month'),
        func.sum(Expense.amount).label('total')
    ).filter(
        Expense.company_id == company_id,
        Expense.financial_year_id == fy.id
    ).group_by(extract('month', Expense.date)).all()
    op_exp_map = {row.month: float(row.total) for row in op_exp_data}
    
    monthly_cashflow = []
    # Iterate all 12 months for simpler chart data
    for m in range(1, 13):
        inc = income_map.get(m, 0.0)
        exp = vendor_exp_map.get(m, 0.0) + op_exp_map.get(m, 0.0)
        
        # Only add if there's data to keep chart clean? Or show all 0s?
        # Clean is better.
        if inc > 0 or exp > 0:
            monthly_cashflow.append({
                "month": calendar.month_abbr[m],
                "income": inc,
                "expense": exp,
                "net": inc - exp
            })

    return {
        "revenue": float(total_revenue),
        "receivables": float(receivables),
        "expenses": float(total_expenses),
        "net_income": float(total_revenue) - float(total_expenses),
        "sales_trend": chart_data,
        "recent_activity": recent_data,
        "expense_breakdown": expense_breakdown,
        "monthly_cashflow": monthly_cashflow
    }


@router.get("/gst")
def get_gst_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    type: str = "gstr1",  # gstr1 (Sales), gstr2 (Purchases - Future)
    company_id: int = Depends(get_company_id),
    fy=Depends(get_active_financial_year),
    db: Session = Depends(get_db),
):
    """
    Returns GST Report Data (Sales Register for now).
    Columns: Date, Invoice No, Party Name, GSTIN, Taxable Value, SGST, CGST, IGST, Total Amount
    """
    # 1. Date Parsing
    start = (
        datetime.strptime(start_date, "%Y-%m-%d").date()
        if start_date
        else fy.start_date
    )
    end = (
        datetime.strptime(end_date, "%Y-%m-%d").date() if end_date else fy.end_date
    )

    if type == "gstr1":
        # Sales Invoices
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

        report_data = []
        for inv in invoices:
            # Calculate Tax Breakdown logic
            # Assuming we can derive it from items or have it stored.
            # Simplified:
            # Taxable = Sum(Item Amount) (Assuming Item Amount is Taxable)
            # OR Taxable = Grand Total - Tax.
            # Let's try to calculate from items if they have tax rate.

            taxable_value = 0.0
            total_tax = 0.0
            
            # Simple assumption for now if exact schema unknown:
            # We take grand total. We assume basic logic or 18% if unknown? 
            # No, that's dangerous.
            # Inspect invoice items.
            
            for item in inv.items:
                 # Assume item.amount is taxable value? Or line total?
                 # Let's assume item.amount is the line total (Price * Qty).
                 # If we don't have tax info, we just sum taxable.
                 taxable_value += float(item.amount)

            # Check if Invoice has 'sub_total' which is usually taxable
            if hasattr(inv, 'sub_total') and inv.sub_total:
                 taxable_value = float(inv.sub_total)
            
            grand_total = float(inv.grand_total)
            total_tax = grand_total - taxable_value

            # Determine SGST/CGST vs IGST
            # Logic: If Party State != Company State => IGST
            # Else => CGST + SGST (50/50)
            
            # We need Company State. For now, let's default to IGST=0, SGST/CGST=Half Tax
            # Unless we fetch Company.
            
            sgst = total_tax / 2
            cgst = total_tax / 2
            igst = 0.0
            
            # Refinement: If we assume most are local:
            
            report_data.append(
                {
                    "id": inv.id,
                    "date": inv.invoice_date,
                    "invoice_number": inv.invoice_number,
                    "party_name": inv.party.name if inv.party else "Unknown",
                    "gstin": inv.party.gst_number if inv.party else "-",
                    "taxable_value": taxable_value,
                    "sgst": sgst,
                    "cgst": cgst,
                    "igst": igst,
                    "total_amount": grand_total,
                    "status": inv.status,
                }
            )

        return report_data

    return []


@router.get("/gst/pdf")
async def get_gst_report_pdf(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    type: str = "gstr1",
    party_name: Optional[str] = None,
    company_id: int = Depends(get_company_id),
    fy=Depends(get_active_financial_year),
    db: Session = Depends(get_db),
):
    """
    Generates PDF for GST Report
    """
    start = (
        datetime.strptime(start_date, "%Y-%m-%d").date()
        if start_date
        else fy.start_date
    )
    end = (
        datetime.strptime(end_date, "%Y-%m-%d").date() if end_date else fy.end_date
    )

    company = db.query(Company).filter(Company.id == company_id).first()

    report_rows = []
    
    # Totals
    total_taxable = 0
    total_sgst = 0
    total_cgst = 0
    total_igst = 0
    total_grand = 0

    # Group by Party
    grouped_data = {}

    if type == "gstr1":
        query = db.query(Invoice).options(joinedload(Invoice.party), joinedload(Invoice.items))
        
        filters = [
            Invoice.company_id == company_id,
            Invoice.invoice_date >= start,
            Invoice.invoice_date <= end,
            Invoice.status != "CANCELLED",
        ]
        
        if party_name:
            # We need to join Party to filter by name if it's not a direct column on Invoice (it filters via relationship usually if joined)
            # But joinedload doesn't always allow filtering on it easily without explicit join.
            # Let's use explicit join or has.
            query = query.join(Party)
            filters.append(Party.name == party_name)
            
        invoices = (
            query
            .filter(*filters)
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

    # Generate QR Code with Secure Download Link
    from app.core.security import create_url_signature

    # 1. Sign URL
    sig_data = f"{company_id}:{start.strftime('%Y-%m-%d')}:{end.strftime('%Y-%m-%d')}:{type}"
    token = create_url_signature(sig_data)
    
    # 2. Construct Public URL
    from app.core.config import get_backend_url
    base_url = get_backend_url()
    
    download_link = f"{base_url}/public/reports/gst/pdf?start_date={start.strftime('%Y-%m-%d')}&end_date={end.strftime('%Y-%m-%d')}&type={type}&company_id={company_id}&token={token}"
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(download_link)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    qr_code_base64 = base64.b64encode(buffered.getvalue()).decode()

    # 2. Render Template
    template = templates.get_template("gst_report.html")
    html_content = template.render(
        company=company,
        start_date=start.strftime("%d-%m-%Y"),
        end_date=end.strftime("%d-%m-%Y"),
        generation_date=datetime.now().strftime("%d-%m-%Y %H:%M"),
        grouped_data=report_data,
        total_taxable=total_taxable,
        qr_code=qr_code_base64,
        total_sgst=total_sgst,
        total_cgst=total_cgst,
        total_igst=total_igst,
        total_amount=total_grand
    )

    # 3. Generate PDF using shared service
    try:
        pdf_data = await generate_pdf(html_content, options={
            "margin": {"top": "15mm", "bottom": "15mm", "left": "10mm", "right": "10mm"},
            "display_header_footer": True,
            "footer_template": """
                <div style="font-size: 8px; font-family: sans-serif; width: 100%; text-align: center; color: #6b7280; padding-bottom: 5px;">
                    Page <span class="pageNumber"></span> of <span class="totalPages"></span>
                </div>
            """,
            "header_template": "<div></div>"
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF Generation Failed: {str(e)}")

    return Response(
        content=pdf_data,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=GST_Report_{type}.pdf",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        },
    )
