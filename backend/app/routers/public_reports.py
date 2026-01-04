from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_
from fastapi.responses import Response
from jinja2 import Environment, FileSystemLoader
from playwright.sync_api import sync_playwright
from starlette.concurrency import run_in_threadpool
from datetime import datetime
import os

from app.database.session import get_db
from app.models.company import Company
from app.models.financial_year import FinancialYear
from app.models.party_challan_item import PartyChallanItem
from app.models.party_challan import PartyChallan
from app.models.party import Party
from app.models.item import Item
from app.core.security import verify_url_signature

router = APIRouter(prefix="/public/reports", tags=["Public Reports"])

# Set up Jinja2
templates_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
env = Environment(loader=FileSystemLoader(templates_dir))

@router.get("/ledger/download")
async def public_ledger_download(
    company_id: int,
    fy_id: int,
    token: str,
    party_id: int = None,
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
        
        pending_qty = float(row.quantity_ordered) - float(row.quantity_delivered)
        pending = max(0.0, pending_qty)

        is_opening = row.party_challan.financial_year_id != fy.id

        if is_opening:
            ledger_map[key]["opening"] += pending
            ledger_map[key]["balance"] += pending
        else:
            ledger_map[key]["in"] += float(row.quantity_ordered)
            ledger_map[key]["out"] += float(row.quantity_delivered)
            ledger_map[key]["balance"] += pending

    # Format numbers
    ledger_data = []
    for item in ledger_map.values():
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
        party_name=party_name,
        generation_date=datetime.now().strftime("%d-%m-%Y %H:%M"),
        ledger_data=ledger_data,
        qr_code=None # Avoid recursive QR or just omit
    )

    # 6. Generate PDF Sync
    def _generate_pdf_sync(html: str) -> bytes:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page()
            page.set_content(html)
            pdf = page.pdf(format="A4", margin={"top": "10mm", "bottom": "10mm", "left": "10mm", "right": "10mm"})
            browser.close()
            return pdf

    pdf_data = await run_in_threadpool(_generate_pdf_sync, html_content)
    
    filename = f"Stock_Ledger_{party_name.replace(' ', '_')}.pdf" if party_name else "Stock_Ledger_All.pdf"
    
    return Response(
        content=pdf_data,
        media_type="application/pdf",
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
    
    current_url = f"http://192.168.31.139:8000/public/reports/gst/pdf?start_date={start_date}&end_date={end_date}&type={type}&company_id={company_id}&token={token}"
    
    qr = qrcode.QRCode(
        version=1,
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

    # 6. Generate PDF (Sync Playwright)
    def _generate_pdf_sync(html: str) -> bytes:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.set_content(html)
            pdf = page.pdf(
                format="A4",
                margin={"top": "15mm", "bottom": "15mm", "left": "10mm", "right": "10mm"},
                display_header_footer=True,
                footer_template="""
                    <div style="font-size: 8px; font-family: sans-serif; width: 100%; text-align: center; color: #6b7280; padding-bottom: 5px;">
                        Page <span class="pageNumber"></span> of <span class="totalPages"></span>
                    </div>
                """,
                header_template="<div></div>"
            )
            browser.close()
            return pdf

    pdf_data = await run_in_threadpool(_generate_pdf_sync, html_content)
    
    filename = f"GST_Report_{start.strftime('%d%m%y')}_{end.strftime('%d%m%y')}.pdf"
    
    return Response(
        content=pdf_data,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )
