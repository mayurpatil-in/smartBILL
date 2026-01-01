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
