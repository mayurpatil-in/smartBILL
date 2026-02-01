from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List

from app.database.session import get_db
from app.client_dependencies import get_current_client
from app.models.client_login import ClientLogin
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.financial_year import FinancialYear
from app.schemas.invoice import InvoiceResponse
from pydantic import BaseModel

router = APIRouter(prefix="/client", tags=["client-portal"])

# Financial Year Schema
class FinancialYearResponse(BaseModel):
    id: int
    start_date: str
    end_date: str
    is_active: bool
    year_name: str  # Computed field like "2024-25"

@router.get("/financial-years", response_model=List[FinancialYearResponse])
def get_financial_years(
    client: ClientLogin = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Get all financial years for the client's company"""
    # Get company_id from the first invoice (all invoices belong to same company)
    sample_invoice = db.query(Invoice).filter(
        Invoice.party_id == client.party_id
    ).first()
    
    if not sample_invoice:
        return []
    
    company_id = sample_invoice.company_id
    
    financial_years = db.query(FinancialYear).filter(
        FinancialYear.company_id == company_id
    ).order_by(desc(FinancialYear.start_date)).all()
    
    result = []
    for fy in financial_years:
        # Create year_name like "2024-25"
        start_year = fy.start_date.year
        end_year = fy.end_date.year
        year_name = f"{start_year}-{str(end_year)[-2:]}"
        
        result.append(FinancialYearResponse(
            id=fy.id,
            start_date=str(fy.start_date),
            end_date=str(fy.end_date),
            is_active=fy.is_active,
            year_name=year_name
        ))
    
    return result

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
    financial_year_id: int | None = None,
    client: ClientLogin = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    party_id = client.party_id
    party = client.party
    
    # 1. Calculate Balance (Using logic from Party router)
     # Sum of Invoices (Debit)
    invoice_query = db.query(func.sum(Invoice.grand_total)).filter(
        Invoice.party_id == party_id,
        Invoice.status != "CANCELLED"
    )
    if financial_year_id:
        invoice_query = invoice_query.filter(Invoice.financial_year_id == financial_year_id)
    invoice_total = invoice_query.scalar() or 0
    
    # Sum of Payments Received
    payment_received_query = db.query(func.sum(Payment.amount)).filter(
        Payment.party_id == party_id,
        Payment.payment_type == "RECEIVED"
    )
    if financial_year_id:
        payment_received_query = payment_received_query.filter(Payment.financial_year_id == financial_year_id)
    total_received = payment_received_query.scalar() or 0
    
    # Sum of Payments Paid (Rare for clients, but usually refunds)
    payment_paid_query = db.query(func.sum(Payment.amount)).filter(
        Payment.party_id == party_id,
        Payment.payment_type == "PAID"
    )
    if financial_year_id:
        payment_paid_query = payment_paid_query.filter(Payment.financial_year_id == financial_year_id)
    total_paid = payment_paid_query.scalar() or 0
    
    current_balance = float(party.opening_balance) + float(invoice_total) - float(total_received) + float(total_paid)
    
    # 2. Last Payment
    last_payment = db.query(Payment).filter(
        Payment.party_id == party_id,
        Payment.payment_type == "RECEIVED"
    ).order_by(desc(Payment.payment_date)).first()
    
    # 3. Open Invoices Count
    open_invoices_query = db.query(func.count(Invoice.id)).filter(
        Invoice.party_id == party_id,
        Invoice.status.in_(["DRAFT", "SENT", "OVERDUE", "PARTIALLY_PAID", "OPEN"]) 
        # Note: "PAID" is settled. "CANCELLED" is void.
    )
    if financial_year_id:
        open_invoices_query = open_invoices_query.filter(Invoice.financial_year_id == financial_year_id)
    open_invoices = open_invoices_query.scalar() or 0
    
    # 4. Recent Invoices (Limit 5)
    recent_invoices_query = db.query(Invoice).filter(
        Invoice.party_id == party_id,
        Invoice.status != "CANCELLED"
    )
    if financial_year_id:
        recent_invoices_query = recent_invoices_query.filter(Invoice.financial_year_id == financial_year_id)
    recent_invoices = recent_invoices_query.order_by(desc(Invoice.invoice_date)).limit(5).all()

    # 5. Monthly Stats (Last 6 months)
    # We want a list of {name: "Jan", total: 5000}
    from datetime import datetime
    from dateutil.relativedelta import relativedelta
    
    today = datetime.now()
    monthly_stats = []
    
    for i in range(5, -1, -1):
        # Go back exactly i months using relativedelta
        target_month = today - relativedelta(months=i)
        month_start = target_month.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Calculate next month start for range
        next_month = month_start + relativedelta(months=1)
            
        monthly_query = db.query(func.sum(Invoice.grand_total)).filter(
            Invoice.party_id == party_id,
            Invoice.status != "CANCELLED",
            Invoice.invoice_date >= month_start,
            Invoice.invoice_date < next_month
        )
        if financial_year_id:
            monthly_query = monthly_query.filter(Invoice.financial_year_id == financial_year_id)
        total = monthly_query.scalar() or 0
        
        monthly_stats.append({
            "name": month_start.strftime("%b"),
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
    financial_year_id: int | None = None,
    client: ClientLogin = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    invoices_query = db.query(Invoice).filter(
        Invoice.party_id == client.party_id,
        Invoice.status != "CANCELLED" # Show invalid? Maybe not.
    )
    if financial_year_id:
        invoices_query = invoices_query.filter(Invoice.financial_year_id == financial_year_id)
    invoices = invoices_query.order_by(desc(Invoice.invoice_date)).all()
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


# ==================================================
# NEW FEATURES: LEDGER, PROFILE, PASSWORD
# ==================================================

# --- Schemas ---
from datetime import date, datetime

class LedgerItem(BaseModel):
    date: date
    type: str  # "INVOICE" or "PAYMENT"
    ref_number: str
    description: str | None
    debit: float  # Invoice Amount
    credit: float # Payment Amount
    balance: float

class LedgerResponse(BaseModel):
    opening_balance: float
    closing_balance: float
    items: List[LedgerItem]

class ProfileUpdate(BaseModel):
    name: str
    phone: str | None
    address: str | None
    gst_number: str | None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

# --- Endpoints ---

@router.get("/ledger", response_model=LedgerResponse)
def get_client_ledger(
    start_date: date | None = None,
    end_date: date | None = None,
    financial_year_id: int | None = None,
    client: ClientLogin = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    party_id = client.party_id
    party = client.party
    
    # 1. Fetch Invoices
    invoices_query = db.query(Invoice).filter(
        Invoice.party_id == party_id,
        Invoice.status != "CANCELLED"
    )
    if financial_year_id:
        invoices_query = invoices_query.filter(Invoice.financial_year_id == financial_year_id)
    if start_date:
        invoices_query = invoices_query.filter(Invoice.invoice_date >= start_date)
    if end_date:
        invoices_query = invoices_query.filter(Invoice.invoice_date <= end_date)
        
    invoices = invoices_query.all()
    
    # 2. Fetch Payments (Received)
    payments_query = db.query(Payment).filter(
        Payment.party_id == party_id,
        # Only consider RECEIVED for credit
        Payment.payment_type.in_(["RECEIVED"]) 
    )
    if financial_year_id:
        payments_query = payments_query.filter(Payment.financial_year_id == financial_year_id)
    if start_date:
        payments_query = payments_query.filter(Payment.payment_date >= start_date)
    if end_date:
        payments_query = payments_query.filter(Payment.payment_date <= end_date)
        
    payments = payments_query.all()
    
    # 3. Calculate Opening Balance (if start_date provided)
    opening_balance = float(party.opening_balance)
    
    if start_date:
        # Sum prior invoices
        prior_inv_query = db.query(func.sum(Invoice.grand_total)).filter(
            Invoice.party_id == party_id,
            Invoice.status != "CANCELLED",
            Invoice.invoice_date < start_date
        )
        if financial_year_id:
            prior_inv_query = prior_inv_query.filter(Invoice.financial_year_id == financial_year_id)
        prior_inv = prior_inv_query.scalar() or 0
        
        # Sum prior payments
        prior_pay_query = db.query(func.sum(Payment.amount)).filter(
            Payment.party_id == party_id,
            Payment.payment_type == "RECEIVED",
            Payment.payment_date < start_date
        )
        if financial_year_id:
            prior_pay_query = prior_pay_query.filter(Payment.financial_year_id == financial_year_id)
        prior_pay = prior_pay_query.scalar() or 0
        
        opening_balance = opening_balance + float(prior_inv) - float(prior_pay)

    # 4. Merge and Sort
    ledger_items = []
    
    for inv in invoices:
        ledger_items.append({
            "date": inv.invoice_date, # It's a datetime usually, check model
            "type": "INVOICE",
            "ref_number": inv.invoice_number,
            "description": "Invoice Generated",
            "debit": float(inv.grand_total),
            "credit": 0.0,
            "raw_date": inv.invoice_date
        })
        
    for pay in payments:
        ledger_items.append({
            "date": pay.payment_date,
            "type": "PAYMENT",
            "ref_number": pay.reference_number or "-",
            "description": f"Payment via {pay.payment_mode}",
            "debit": 0.0,
            "credit": float(pay.amount),
            "raw_date": pay.payment_date
        })
        
    # Sort by date
    # Ensure raw_date is comparable (both date or both datetime)
    # Usually invoice_date is DateTime, payment_date is Date. Safe to compare?
    # Python allows comparison if both are just Date. If one is DateTime, it might fail.
    # Let's normalize to date objects.
    
    def get_sort_date(item):
        d = item["raw_date"]
        if isinstance(d, datetime):
            return d.date()
        return d

    ledger_items.sort(key=get_sort_date)
    
    # 5. Calculate Running Balance
    running_balance = opening_balance
    final_items = []
    
    for item in ledger_items:
        running_balance = running_balance + item["debit"] - item["credit"]
        final_items.append(LedgerItem(
            date=item["date"],
            type=item["type"],
            ref_number=item["ref_number"],
            description=item["description"],
            debit=item["debit"],
            credit=item["credit"],
            balance=running_balance
        ))
        
    return {
        "opening_balance": opening_balance,
        "closing_balance": running_balance,
        "items": final_items
    }


@router.get("/profile")
def get_client_profile(
    client: ClientLogin = Depends(get_current_client)
):
    # Return party details directly
    return {
        "name": client.party.name,
        "phone": client.party.phone,
        "address": client.party.address,
        "gst_number": client.party.gst_number,
        "username": client.username # Read-only
    }

@router.put("/profile")
def update_client_profile(
    data: ProfileUpdate,
    client: ClientLogin = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    party = client.party
    party.name = data.name
    party.phone = data.phone
    party.address = data.address
    party.gst_number = data.gst_number
    
    db.commit()
    return {"message": "Profile updated successfully"}

@router.put("/change-password")
def change_client_password(
    data: PasswordChange,
    client: ClientLogin = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    from app.core.security import verify_password, get_password_hash
    
    # 1. Verify old password
    if not verify_password(data.current_password, client.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect current password")
        
    # 2. Update new password
    client.password_hash = get_password_hash(data.new_password)
    db.commit()
    
    return {"message": "Password changed successfully"}
