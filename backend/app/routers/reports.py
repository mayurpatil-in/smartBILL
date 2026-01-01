from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_, and_
from typing import List, Optional
from datetime import datetime
from jinja2 import Environment, FileSystemLoader
from playwright.sync_api import sync_playwright
from starlette.concurrency import run_in_threadpool

from app.database.session import get_db
from app.models.company import Company
from app.core.dependencies import get_company_id, get_active_financial_year
from app.models.party_challan_item import PartyChallanItem
from app.models.party_challan import PartyChallan
from app.models.party import Party
from app.models.item import Item
from app.models.process import Process

router = APIRouter(prefix="/reports", tags=["Reports"])

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
    ).order_by(
        PartyChallan.challan_date.desc()
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

    # 3. Aggregate Data
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
        # Ensure non-negative pending
        pending = max(0.0, pending_qty)

        is_opening = row.party_challan.financial_year_id != fy.id

        if is_opening:
            ledger_map[key]["opening"] += pending
            ledger_map[key]["balance"] += pending
        else:
            ledger_map[key]["in"] += float(row.quantity_ordered)
            ledger_map[key]["out"] += float(row.quantity_delivered)
            ledger_map[key]["balance"] += pending

    # Format numbers for template
    ledger_data = []
    for item in ledger_map.values():
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
    base_url = "http://localhost:5173" # Default
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        lan_ip = s.getsockname()[0]
        s.close()
        # Use backend port for public download if serving from API, or frontend if it proxies.
        # But public_reports is on API port 8000.
        # Let's point to API URL (port 8000 usually)
        base_url = f"http://{lan_ip}:8000"
    except:
        pass

    # Sign the parameters
    party_val = str(party_id) if party_id else "all"
    data_to_sign = f"{company_id}:{fy.id}:{party_val}"
    token = create_url_signature(data_to_sign)
    
    download_url = f"{base_url}/public/reports/ledger/download?company_id={company_id}&fy_id={fy.id}&token={token}"
    if party_id:
        download_url += f"&party_id={party_id}"
    
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(download_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    qr_code_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

    # 5. Render HTML
    env = Environment(loader=FileSystemLoader("app/templates"))
    template = env.get_template("party_ledger.html")
    
    html_content = template.render(
        company=company,
        financial_year=f"{fy.start_date.year}-{fy.end_date.year}",
        party_name=party_name,
        generation_date=datetime.now().strftime("%d-%m-%Y %H:%M"),
        ledger_data=ledger_data,
        qr_code=qr_code_b64
    )

    # 5. Generate PDF with Playwright (Sync in Thread)
    def _generate_pdf_sync(html: str) -> bytes:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page()
            page.set_content(html)
            pdf = page.pdf(format="A4", margin={"top": "10mm", "bottom": "10mm", "left": "10mm", "right": "10mm"})
            browser.close()
            return pdf

    pdf_data = await run_in_threadpool(_generate_pdf_sync, html_content)

    # 6. Return Response
    filename = f"Stock_Ledger_{party_name.replace(' ', '_')}.pdf" if party_name else "Stock_Ledger_All.pdf"
    
    return Response(
        content=pdf_data,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
