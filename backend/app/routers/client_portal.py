from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List

from app.database.session import get_db
from app.client_dependencies import get_current_client
from app.models.client_login import ClientLogin
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.schemas.invoice import InvoiceResponse
from pydantic import BaseModel

router = APIRouter(prefix="/client", tags=["client-portal"])

# Schemas
class ClientDashboardStats(BaseModel):
    party_name: str
    total_outstanding: float
    last_payment_date: str | None
    last_payment_amount: float
    open_invoices_count: int
    recent_invoices: List[InvoiceResponse]
    monthly_stats: List[dict]

@router.get("/dashboard", response_model=ClientDashboardStats)
def get_client_dashboard(
    client: ClientLogin = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    party_id = client.party_id
    party = client.party
    
    # 1. Calculate Balance (Using logic from Party router)
     # Sum of Invoices (Debit)
    invoice_total = db.query(func.sum(Invoice.grand_total)).filter(
        Invoice.party_id == party_id,
        Invoice.status != "CANCELLED"
    ).scalar() or 0
    
    # Sum of Payments Received
    total_received = db.query(func.sum(Payment.amount)).filter(
        Payment.party_id == party_id,
        Payment.payment_type == "RECEIVED"
    ).scalar() or 0
    
    # Sum of Payments Paid (Rare for clients, but usually refunds)
    total_paid = db.query(func.sum(Payment.amount)).filter(
        Payment.party_id == party_id,
        Payment.payment_type == "PAID"
    ).scalar() or 0
    
    current_balance = float(party.opening_balance) + float(invoice_total) - float(total_received) + float(total_paid)
    
    # 2. Last Payment
    last_payment = db.query(Payment).filter(
        Payment.party_id == party_id,
        Payment.payment_type == "RECEIVED"
    ).order_by(desc(Payment.payment_date)).first()
    
    # 3. Open Invoices Count
    open_invoices = db.query(func.count(Invoice.id)).filter(
        Invoice.party_id == party_id,
        Invoice.status.in_(["DRAFT", "SENT", "OVERDUE", "PARTIALLY_PAID"]) 
        # Note: "PAID" is settled. "CANCELLED" is void.
    ).scalar() or 0
    
    # 4. Recent Invoices (Limit 5)
    recent_invoices = db.query(Invoice).filter(
        Invoice.party_id == party_id,
        Invoice.status != "CANCELLED"
    ).order_by(desc(Invoice.invoice_date)).limit(5).all()

    # 5. Monthly Stats (Last 6 months)
    # We want a list of {name: "Jan", total: 5000}
    # This is a bit complex in pure SQL cross-db, so we can do it in python for simplicity or simple group by
    # Let's do a simple python aggregation for the last 6 months to ensure all months are present even if 0
    from datetime import datetime, timedelta
    today = datetime.now()
    monthly_stats = []
    
    for i in range(5, -1, -1):
        # iterate back 6 months
        d = today - timedelta(days=i*30) # approx
        month_start = d.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        # End of month is tricky, so let's just use start of next month for range
        if d.month == 12:
            next_month = d.replace(year=d.year+1, month=1, day=1)
        else:
            next_month = d.replace(month=d.month+1, day=1)
            
        total = db.query(func.sum(Invoice.grand_total)).filter(
            Invoice.party_id == party_id,
            Invoice.status != "CANCELLED",
            Invoice.invoice_date >= month_start,
            Invoice.invoice_date < next_month
        ).scalar() or 0
        
        monthly_stats.append({
            "name": d.strftime("%b"),
            "total": float(total)
        })

    return {
        "party_name": party.name,
        "total_outstanding": current_balance,
        "last_payment_date": str(last_payment.payment_date) if last_payment else None,
        "last_payment_amount": float(last_payment.amount) if last_payment else 0.0,
        "open_invoices_count": open_invoices,
        "recent_invoices": recent_invoices,
        "monthly_stats": monthly_stats
    }


@router.get("/invoices", response_model=List[InvoiceResponse])
def get_client_invoices(
    client: ClientLogin = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    invoices = db.query(Invoice).filter(
        Invoice.party_id == client.party_id,
        Invoice.status != "CANCELLED" # Show invalid? Maybe not.
    ).order_by(desc(Invoice.invoice_date)).all()
    return invoices

@router.get("/invoices/{invoice_id}/download")
async def download_invoice_pdf(
    invoice_id: int,
    client: ClientLogin = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    from fastapi.responses import Response
    from sqlalchemy.orm import joinedload
    from app.models.invoice_item import InvoiceItem
    from app.models.company import Company
    from app.services.pdf_service import generate_pdf
    from jinja2 import Environment, FileSystemLoader, select_autoescape
    import os
    import io
    import base64
    import qrcode
    from num2words import num2words
    from app.core.config import get_backend_url
    from app.core.security import create_url_signature

    # Verify ownership matches client's party
    invoice = db.query(Invoice).options(
        joinedload(Invoice.party),
        joinedload(Invoice.financial_year),
        joinedload(Invoice.items).joinedload(InvoiceItem.item)
    ).filter(
        Invoice.id == invoice_id,
        Invoice.party_id == client.party_id
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    company = db.query(Company).get(invoice.company_id)
    
    # Helper for currency
    def format_inr(number):
        try:
            s, *d = str("{:.2f}".format(float(number))).partition(".")
            r = ",".join([s[x-2:x] for x in range(-3, -len(s), -2)][::-1] + [s[-3:]])
            return "".join([r] + d) if r else d[0]
        except:
            return str(number)

    # Generate QR Code (Points to public download link)
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

    # Set up Jinja2
    templates_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
    env = Environment(
        loader=FileSystemLoader(templates_dir),
        autoescape=select_autoescape(['html', 'xml'])
    )

    # Render Template
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

    # Generate PDF
    try:
        pdf_content = await generate_pdf(html)
    except Exception as e:
        print(f"PDF Generation Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate PDF")

    # Return PDF
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=Invoice-{invoice.invoice_number}.pdf"}
    )
