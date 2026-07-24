from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc
from typing import List, Optional

from app.database.session import get_db
from app.client_dependencies import get_current_client
from app.models.client_login import ClientLogin
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.financial_year import FinancialYear
from app.models.party_challan import PartyChallan
from app.models.party_challan_item import PartyChallanItem
from app.models.delivery_challan import DeliveryChallan
from app.models.delivery_challan_item import DeliveryChallanItem
from app.models.company import Company
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
    # Get company_id directly from the Party linked to this ClientLogin
    company_id = client.party.company_id
    
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


@router.get("/company-info")
def get_client_company_info(
    client: ClientLogin = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    company_id = client.party.company_id
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    return {
        "name": company.name,
        "gst_number": company.gst_number,
        "phone": company.phone,
        "email": company.email,
        "address": company.address,
        "pincode": company.pincode,
        "logo": company.logo
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

@router.get("/invoices/{invoice_id}/details")
def get_client_invoice_details(
    invoice_id: int,
    client: ClientLogin = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    from app.models.invoice_item import InvoiceItem

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

    company = db.query(Company).filter(Company.id == invoice.company_id).first()

    subtotal = float(invoice.subtotal or 0)
    gst_amount = float(invoice.gst_amount or 0)
    eff_gst_rate = round((gst_amount / subtotal * 100), 1) if subtotal > 0 else 18.0

    items = []
    for item in invoice.items:
        item_qty = float(item.quantity or 0)
        item_rate = float(item.rate or 0)
        item_amount = float(item.amount or (item_qty * item_rate))
        item_hsn = item.item.hsn_code if (item.item and hasattr(item.item, 'hsn_code')) else None
        item_name = item.item.name if item.item else "Invoice Item"

        items.append({
            "id": item.id,
            "item_name": item_name,
            "hsn_code": item_hsn,
            "quantity": item_qty,
            "unit": "Pcs",
            "rate": item_rate,
            "amount": item_amount,
            "gst_rate": eff_gst_rate,
            "gst_amount": round(item_amount * (eff_gst_rate / 100), 2),
        })

    return {
        "id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "invoice_date": str(invoice.invoice_date),
        "due_date": str(invoice.due_date) if invoice.due_date else None,
        "status": invoice.status,
        "subtotal": subtotal,
        "gst_amount": gst_amount,
        "discount_amount": float(getattr(invoice, "discount_amount", 0) or 0),
        "round_off": float(getattr(invoice, "round_off", 0) or 0),
        "grand_total": float(invoice.grand_total or 0),
        "notes": invoice.notes,
        "terms": getattr(invoice, "terms", None),
        "company": {
            "name": company.name if company else "",
            "gst_number": company.gst_number if company else "",
            "phone": company.phone if company else "",
            "email": company.email if company else "",
            "address": company.address if company else ""
        },
        "items": items
    }



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
        media_type="text/html",
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


@router.get("/ledger/download")
async def download_client_ledger_pdf(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    financial_year_id: Optional[int] = None,
    client: ClientLogin = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Renders and returns a professional Statement of Account HTML document
    using the executive party_statement.html template.
    """
    from jinja2 import Environment, FileSystemLoader
    import os, io, base64, qrcode
    from datetime import datetime
    from app.models.company import Company
    from app.core.config import get_backend_url
    from app.core.security import create_url_signature

    party = client.party
    company = db.query(Company).get(party.company_id) if party else None

    # 1. Invoices
    invoices_query = db.query(Invoice).filter(
        Invoice.party_id == party.id,
        Invoice.status != "CANCELLED"
    )
    if financial_year_id:
        invoices_query = invoices_query.filter(Invoice.financial_year_id == financial_year_id)
    if start_date:
        invoices_query = invoices_query.filter(Invoice.invoice_date >= start_date)
    if end_date:
        invoices_query = invoices_query.filter(Invoice.invoice_date <= end_date)
    invoices = invoices_query.all()

    # 2. Payments
    payments_query = db.query(Payment).filter(
        Payment.party_id == party.id,
        Payment.payment_type.in_(["RECEIVED"])
    )
    if financial_year_id:
        payments_query = payments_query.filter(Payment.financial_year_id == financial_year_id)
    if start_date:
        payments_query = payments_query.filter(Payment.payment_date >= start_date)
    if end_date:
        payments_query = payments_query.filter(Payment.payment_date <= end_date)
    payments = payments_query.all()

    # 3. Opening Balance
    opening_balance = float(party.opening_balance) if party and party.opening_balance else 0.0
    if start_date:
        prior_inv_query = db.query(func.sum(Invoice.grand_total)).filter(
            Invoice.party_id == party.id,
            Invoice.status != "CANCELLED",
            Invoice.invoice_date < start_date
        )
        if financial_year_id:
            prior_inv_query = prior_inv_query.filter(Invoice.financial_year_id == financial_year_id)
        prior_inv = prior_inv_query.scalar() or 0

        prior_pay_query = db.query(func.sum(Payment.amount)).filter(
            Payment.party_id == party.id,
            Payment.payment_type == "RECEIVED",
            Payment.payment_date < start_date
        )
        if financial_year_id:
            prior_pay_query = prior_pay_query.filter(Payment.financial_year_id == financial_year_id)
        prior_pay = prior_pay_query.scalar() or 0

        opening_balance = opening_balance + float(prior_inv) - float(prior_pay)

    # 4. Merge transactions
    ledger_items = []
    total_debit = 0.0
    total_credit = 0.0

    for inv in invoices:
        amt = float(inv.grand_total)
        total_debit += amt
        ledger_items.append({
            "date": inv.invoice_date,
            "type": "INVOICE",
            "ref_number": inv.invoice_number,
            "description": "Invoice Generated",
            "debit": amt,
            "credit": 0.0,
            "raw_date": inv.invoice_date
        })

    for pay in payments:
        amt = float(pay.amount)
        total_credit += amt
        ledger_items.append({
            "date": pay.payment_date,
            "type": "PAYMENT",
            "ref_number": pay.reference_number or "-",
            "description": f"Payment via {pay.payment_mode}",
            "debit": 0.0,
            "credit": amt,
            "raw_date": pay.payment_date
        })

    def get_sort_date(item):
        d = item["raw_date"]
        if isinstance(d, datetime):
            return d.date()
        return d

    ledger_items.sort(key=get_sort_date)

    # 5. Running Balance & Formatted Rows
    running_balance = opening_balance
    formatted_transactions = []
    for item in ledger_items:
        running_balance = running_balance + item["debit"] - item["credit"]
        d_val = item["raw_date"]
        d_str = d_val.strftime("%d/%m/%Y") if hasattr(d_val, "strftime") else str(d_val)
        formatted_transactions.append({
            "date": d_str,
            "type": item["type"],
            "ref": item["ref_number"],
            "ref_number": item["ref_number"],
            "description": item["description"],
            "debit": f"{item['debit']:,.2f}" if item["debit"] > 0 else "-",
            "credit": f"{item['credit']:,.2f}" if item["credit"] > 0 else "-",
            "balance": f"{running_balance:,.2f}"
        })

    # Financial Year string
    fy_str = "All Periods"
    if financial_year_id:
        fy_obj = db.query(FinancialYear).get(financial_year_id)
        if fy_obj:
            fy_str = f"{fy_obj.start_date.year}-{str(fy_obj.end_date.year)[-2:]}"

    # QR verification code
    base_url = get_backend_url()
    signature = create_url_signature(str(party.id))
    verify_url = f"{base_url}/public/reports/statement/download?party_id={party.id}&company_id={party.company_id}&token={signature}"
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(verify_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    qr_code_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

    templates_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
    env = Environment(loader=FileSystemLoader(templates_dir))
    template = env.get_template("party_statement.html")

    s_date_str = start_date.strftime("%d/%m/%Y") if start_date else (formatted_transactions[0]["date"] if formatted_transactions else datetime.now().strftime("%d/%m/%Y"))
    e_date_str = end_date.strftime("%d/%m/%Y") if end_date else datetime.now().strftime("%d/%m/%Y")

    html_content = template.render(
        company=company,
        party=party,
        financial_year=fy_str,
        start_date=s_date_str,
        end_date=e_date_str,
        generation_date=datetime.now().strftime("%d-%m-%Y %H:%M"),
        transactions=formatted_transactions,
        opening_balance=f"{opening_balance:,.2f}",
        closing_balance=f"{running_balance:,.2f}",
        total_debit=f"{total_debit:,.2f}",
        total_credit=f"{total_credit:,.2f}",
        qr_code=qr_code_b64,
        qr_code_b64=qr_code_b64
    )

    return Response(content=html_content, media_type="text/html")


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


# ==================================================
# CHALLAN TRACKING ENDPOINTS
# ==================================================

# --- Pydantic Schemas ---

class ChallanItemProgress(BaseModel):
    id: int
    item_name: str
    process_name: str | None
    quantity_ordered: float
    quantity_delivered: float
    progress_percent: float

class PartyChallanTrack(BaseModel):
    id: int
    challan_number: str
    challan_date: str
    status: str
    notes: str | None
    working_days: int | None
    items: List[ChallanItemProgress]
    delivery_challan_count: int
    delivery_challans_list: List[dict]  # [{challan_number, status, challan_date}]

class DeliveryChallanItemDetail(BaseModel):
    id: int
    item_name: str
    process_name: str | None
    quantity: float
    ok_qty: float
    cr_qty: float
    mr_qty: float

class DeliveryChallanTrack(BaseModel):
    id: int
    challan_number: str
    challan_date: str
    vehicle_number: str | None
    status: str
    client_status: str | None = "pending"
    client_notes: str | None
    notes: str | None
    party_challan_numbers: List[str]  # All unique party challan refs (from direct FK + items)
    items: List[DeliveryChallanItemDetail]


# --- Endpoints ---

@router.get("/party-challans", response_model=List[PartyChallanTrack])
def get_client_party_challans(
    financial_year_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None, description="Filter by status: open, partial, completed, cancelled"),
    include_cancelled: bool = Query(True, description="Whether to include cancelled challans"),
    start_date: Optional[str] = Query(None, description="Filter from date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Filter to date (YYYY-MM-DD)"),
    client: ClientLogin = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Get all party challans for the logged-in client, with delivery progress per item."""
    party_id = client.party_id

    query = db.query(PartyChallan).options(
        joinedload(PartyChallan.items).joinedload(PartyChallanItem.item),
        joinedload(PartyChallan.items).joinedload(PartyChallanItem.process),
        joinedload(PartyChallan.delivery_challans)
    ).filter(
        PartyChallan.party_id == party_id,
        PartyChallan.is_active == True
    )

    if financial_year_id:
        query = query.filter(PartyChallan.financial_year_id == financial_year_id)

    if status:
        query = query.filter(PartyChallan.status == status.lower())
    elif not include_cancelled:
        query = query.filter(PartyChallan.status != "cancelled")

    if start_date:
        query = query.filter(PartyChallan.challan_date >= start_date)
    if end_date:
        query = query.filter(PartyChallan.challan_date <= end_date)

    challans = query.order_by(desc(PartyChallan.challan_date)).all()

    # Pre-fetch all delivery challans for this client to correctly map via items
    all_dcs = db.query(DeliveryChallan).options(
        joinedload(DeliveryChallan.items).joinedload(DeliveryChallanItem.party_challan_item)
    ).filter(
        DeliveryChallan.party_id == party_id,
        DeliveryChallan.is_active == True
    ).all()

    from collections import defaultdict
    pc_to_dcs = defaultdict(set)
    dc_map = {}
    for dc in all_dcs:
        dc_map[dc.id] = dc
        if dc.party_challan_id:
            pc_to_dcs[dc.party_challan_id].add(dc.id)
        for item in dc.items:
            if item.party_challan_item and item.party_challan_item.party_challan_id:
                pc_to_dcs[item.party_challan_item.party_challan_id].add(dc.id)


    result = []
    for c in challans:
        items_progress = []
        for item in c.items:
            qty_ordered = float(item.quantity_ordered or 0)
            qty_delivered = float(item.quantity_delivered or 0)
            progress = round((qty_delivered / qty_ordered * 100), 1) if qty_ordered > 0 else 0.0

            items_progress.append(ChallanItemProgress(
                id=item.id,
                item_name=item.item.name if item.item else "Unknown",
                process_name=item.process.name if item.process else None,
                quantity_ordered=qty_ordered,
                quantity_delivered=qty_delivered,
                progress_percent=min(progress, 100.0)
            ))

        # Build delivery challan summary list using the collected mapping
        unique_dc_ids = pc_to_dcs.get(c.id, set())
        linked_dcs = [dc_map[dc_id] for dc_id in unique_dc_ids]

        dc_list = [
            {
                "challan_number": dc.challan_number,
                "status": dc.status,
                "challan_date": str(dc.challan_date),
                "client_status": dc.client_status
            }
            for dc in sorted(linked_dcs, key=lambda d: d.challan_date)
        ]

        result.append(PartyChallanTrack(
            id=c.id,
            challan_number=c.challan_number,
            challan_date=str(c.challan_date),
            status=c.status,
            notes=c.notes,
            working_days=c.working_days,
            items=items_progress,
            delivery_challan_count=len(linked_dcs),
            delivery_challans_list=dc_list
        ))

    return result


@router.get("/delivery-challans", response_model=List[DeliveryChallanTrack])
def get_client_delivery_challans(
    financial_year_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None, description="Filter by status: draft, sent, delivered"),
    include_cancelled: bool = Query(True, description="Whether to include draft challans"),
    party_challan_id: Optional[int] = Query(None, description="Filter delivery challans for a specific party challan"),
    start_date: Optional[str] = Query(None, description="Filter from date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Filter to date (YYYY-MM-DD)"),
    client: ClientLogin = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Get all delivery challans dispatched to the logged-in client."""
    party_id = client.party_id

    query = db.query(DeliveryChallan).options(
        joinedload(DeliveryChallan.items).joinedload(DeliveryChallanItem.party_challan_item).joinedload(PartyChallanItem.item),
        joinedload(DeliveryChallan.items).joinedload(DeliveryChallanItem.party_challan_item).joinedload(PartyChallanItem.party_challan),
        joinedload(DeliveryChallan.items).joinedload(DeliveryChallanItem.process),
        joinedload(DeliveryChallan.party_challan)
    ).filter(
        DeliveryChallan.party_id == party_id,
        DeliveryChallan.is_active == True
    )

    if financial_year_id:
        query = query.filter(DeliveryChallan.financial_year_id == financial_year_id)

    if status:
        query = query.filter(DeliveryChallan.status == status.lower())

    if party_challan_id:
        query = query.filter(DeliveryChallan.party_challan_id == party_challan_id)

    if start_date:
        query = query.filter(DeliveryChallan.challan_date >= start_date)
    if end_date:
        query = query.filter(DeliveryChallan.challan_date <= end_date)

    challans = query.order_by(desc(DeliveryChallan.challan_date)).all()

    result = []
    for c in challans:
        items_detail = []
        for item in c.items:
            pc_item = item.party_challan_item
            item_name = "Unknown"
            if pc_item and pc_item.item:
                item_name = pc_item.item.name

            items_detail.append(DeliveryChallanItemDetail(
                id=item.id,
                item_name=item_name,
                process_name=item.process.name if item.process else None,
                quantity=float(item.quantity or 0),
                ok_qty=float(item.ok_qty or 0),
                cr_qty=float(item.cr_qty or 0),
                mr_qty=float(item.mr_qty or 0)
            ))

        # Collect ALL unique party challan numbers for this delivery challan
        # 1. Direct FK link
        pc_numbers = set()
        if c.party_challan:
            pc_numbers.add(c.party_challan.challan_number)
        # 2. Via each item's party_challan_item → party_challan
        for item in c.items:
            pc_item = item.party_challan_item
            if pc_item and pc_item.party_challan:
                pc_numbers.add(pc_item.party_challan.challan_number)

        result.append(DeliveryChallanTrack(
            id=c.id,
            challan_number=c.challan_number,
            challan_date=str(c.challan_date),
            vehicle_number=c.vehicle_number,
            status=c.status,
            client_status=c.client_status,
            client_notes=c.client_notes,
            notes=c.notes,
            party_challan_numbers=sorted(pc_numbers),
            items=items_detail
        ))

    return result


@router.get("/delivery-challans/{challan_id}/download")
async def download_delivery_challan_pdf(
    challan_id: int,
    client: ClientLogin = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Download a Delivery Challan PDF from the client portal."""
    from fastapi.responses import Response
    from jinja2 import Environment, FileSystemLoader, select_autoescape
    from app.services.pdf_service import generate_pdf
    from app.models.company import Company
    import os
    import qrcode
    import io
    import base64

    # Verify ownership — the challan must belong to this client's party
    challan = db.query(DeliveryChallan).options(
        joinedload(DeliveryChallan.party),
        joinedload(DeliveryChallan.items).joinedload(DeliveryChallanItem.party_challan_item).joinedload(PartyChallanItem.item),
        joinedload(DeliveryChallan.items).joinedload(DeliveryChallanItem.party_challan_item).joinedload(PartyChallanItem.party_challan),
        joinedload(DeliveryChallan.items).joinedload(DeliveryChallanItem.process)
    ).filter(
        DeliveryChallan.id == challan_id,
        DeliveryChallan.party_id == client.party_id  # Security: only own challans
    ).first()

    if not challan:
        raise HTTPException(status_code=404, detail="Delivery Challan not found")

    company = db.query(Company).filter(Company.id == challan.company_id).first()

    # Calculate Total Qty
    total_qty = sum(float(item.quantity) for item in challan.items)

    # Group items (same logic as public_challan.py)
    grouped_data = {}
    for item in challan.items:
        pc_item = item.party_challan_item
        item_id = pc_item.item_id if pc_item else item.id

        if item_id not in grouped_data:
            grouped_data[item_id] = {
                "item_obj": item,
                "pc_items": set(),
                "ref_challans": {},
                "dispatch": 0.0,
                "ok": 0.0,
                "cr": 0.0,
                "mr": 0.0
            }

        if pc_item:
            grouped_data[item_id]["pc_items"].add(pc_item)
            if pc_item.party_challan:
                grouped_data[item_id]["ref_challans"][pc_item.party_challan_id] = pc_item.party_challan

        grouped_data[item_id]["dispatch"] += float(item.quantity)
        grouped_data[item_id]["ok"] += float(item.ok_qty)
        grouped_data[item_id]["cr"] += float(item.cr_qty)
        grouped_data[item_id]["mr"] += float(item.mr_qty)

    items_data = []
    sorted_keys = sorted(
        grouped_data.keys(),
        key=lambda k: grouped_data[k]["item_obj"].party_challan_item.item.name
        if grouped_data[k]["item_obj"].party_challan_item else ""
    )

    for key in sorted_keys:
        data = grouped_data[key]
        current_dispatch = data["dispatch"]

        opening_qty = 0
        balance_qty = 0

        if data["pc_items"]:
            item_ordered_total = sum(float(pci.quantity_ordered) for pci in data["pc_items"])
            item_delivered_total = sum(float(pci.quantity_delivered) for pci in data["pc_items"])
            raw_closing_balance = item_ordered_total - item_delivered_total
            raw_opening_balance = raw_closing_balance + current_dispatch
            opening_qty = max(0, raw_opening_balance)
            balance_qty = max(0, raw_closing_balance)

        ref_list = []
        for pc_obj in data["ref_challans"].values():
            pc_grand_total = int(sum(float(i.quantity_ordered) for i in pc_obj.items))
            ref_str = f"{pc_obj.challan_number} | {pc_obj.challan_date.strftime('%d-%m-%Y')} | {pc_grand_total}"
            ref_list.append(ref_str)

        class ProxyItem:
            def __init__(self, original, ok, cr, mr):
                self.party_challan_item = original.party_challan_item
                self.process = original.process
                self.ok_qty = int(ok)
                self.cr_qty = int(cr)
                self.mr_qty = int(mr)
                eff_rate = float(original.rate) if original.rate and original.rate > 0 else (
                    float(original.party_challan_item.rate) if original.party_challan_item and original.party_challan_item.rate and original.party_challan_item.rate > 0 else (
                        float(original.party_challan_item.item.rate) if original.party_challan_item and original.party_challan_item.item and original.party_challan_item.item.rate else 0.0
                    )
                )
                self.rate = eff_rate
                self.party_rate = float(original.party_rate or 0)
                total_qty_item = self.ok_qty + self.cr_qty + self.mr_qty
                self.amount_formatted = "{:.2f}".format((self.rate + self.party_rate) * total_qty_item)

        proxy_item_obj = ProxyItem(data["item_obj"], data["ok"], data["cr"], data["mr"])

        items_data.append({
            "item_obj": proxy_item_obj,
            "opening": int(opening_qty),
            "dispatch": int(current_dispatch),
            "balance": int(balance_qty),
            "ref_list": ref_list
        })

    # Generate QR
    qr_data = f"Challan: {challan.challan_number}\nDate: {challan.challan_date}\nParty: {challan.party.name if challan.party else 'N/A'}"
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(qr_data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    qr_code_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

    # Render Template
    templates_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
    env = Environment(loader=FileSystemLoader(templates_dir), autoescape=select_autoescape(['html', 'xml']))
    template = env.get_template("delivery_challan.html")
    html = template.render(
        challan=challan,
        company=company,
        party=challan.party,
        items=items_data,
        total_qty=total_qty,
        qr_code=qr_code_b64
    )

    try:
        pdf_content = await generate_pdf(html)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")

    return Response(
        content=pdf_content,
        media_type="text/html",
        headers={"Content-Disposition": f"inline; filename=DC-{challan.challan_number}.pdf"}
    )


@router.get("/party-challans/{challan_id}/report/download")
async def download_party_challan_report(
    challan_id: int,
    client: ClientLogin = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    challan = db.query(PartyChallan).options(
        joinedload(PartyChallan.items).joinedload(PartyChallanItem.item),
        joinedload(PartyChallan.items).joinedload(PartyChallanItem.process)
    ).filter(
        PartyChallan.id == challan_id,
        PartyChallan.party_id == client.party_id,
        PartyChallan.is_active == True
    ).first()

    if not challan:
        raise HTTPException(status_code=404, detail="Party Challan not found")

    company = db.query(Company).filter(Company.id == challan.company_id).first()
    company_name = company.name if company else "SmartBill"

    all_dcs = db.query(DeliveryChallan).options(
        joinedload(DeliveryChallan.items).joinedload(DeliveryChallanItem.party_challan_item)
    ).filter(
        DeliveryChallan.party_id == client.party_id,
        DeliveryChallan.is_active == True
    ).all()

    linked_dcs = set()
    for dc in all_dcs:
        if dc.party_challan_id == challan_id:
            linked_dcs.add(dc)
        for item in dc.items:
            if item.party_challan_item and item.party_challan_item.party_challan_id == challan_id:
                linked_dcs.add(dc)

    sorted_dcs = sorted(list(linked_dcs), key=lambda d: d.challan_date)
    last_dispatch = str(sorted_dcs[-1].challan_date) if sorted_dcs else "None"

    item_rows = ""
    for it in challan.items:
        item_name = it.item.name if it.item else "Unknown"
        proc_name = it.process.name if it.process else "N/A"
        qty_ord = it.quantity_ordered or 0
        qty_del = it.quantity_delivered or 0
        qty_pen = qty_ord - qty_del
        pct = round((qty_del / qty_ord * 100), 1) if qty_ord else 0
        item_rows += (
            "<tr><td>" + item_name + "</td><td>" + proc_name + "</td>"
            "<td class='text-right'>" + str(qty_ord) + "</td>"
            "<td class='text-right'>" + str(qty_del) + "</td>"
            "<td class='text-right'>" + str(qty_pen) + "</td>"
            "<td class='text-center'>" + str(pct) + "%</td></tr>"
        )

    dc_rows = ""
    if sorted_dcs:
        for dc in sorted_dcs:
            dc_rows += (
                "<tr><td><strong>" + dc.challan_number + "</strong></td>"
                "<td>" + str(dc.challan_date) + "</td>"
                "<td style='text-transform:capitalize'>" + dc.status + "</td>"
                "<td>" + (dc.vehicle_number or "N/A") + "</td></tr>"
            )
    else:
        dc_rows = "<tr><td colspan='4' style='text-align:center;color:#6b7280;font-style:italic'>No dispatches yet</td></tr>"

    html = (
        "<!DOCTYPE html><html lang='en'><head><meta charset='UTF-8'>"
        "<title>Party Challan Report - " + challan.challan_number + "</title>"
        "<style>"
        "body{font-family:Arial,sans-serif;margin:40px;color:#333}"
        ".header{display:flex;justify-content:space-between;border-bottom:2px solid #ddd;padding-bottom:20px;margin-bottom:30px}"
        ".company-info h1{margin:0;color:#4F46E5}"
        ".document-title{text-align:right}"
        ".document-title h2{margin:0;color:#666;text-transform:uppercase;letter-spacing:2px}"
        ".info-grid{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-bottom:30px}"
        ".info-box{border:1px solid #ddd;padding:15px;border-radius:8px;background:#f9fafb}"
        ".info-box h3{margin-top:0;color:#4b5563;font-size:14px;text-transform:uppercase;border-bottom:1px solid #e5e7eb;padding-bottom:8px}"
        "table{width:100%;border-collapse:collapse;margin-bottom:30px}"
        "th,td{border:1px solid #e5e7eb;padding:12px;text-align:left}"
        "th{background-color:#f3f4f6;font-weight:600;color:#374151}"
        ".text-right{text-align:right}.text-center{text-align:center}"
        ".section-title{font-size:18px;font-weight:600;margin-bottom:15px;border-left:4px solid #4F46E5;padding-left:10px}"
        "@media print{body{margin:0;padding:20px}button{display:none}}"
        "</style></head><body>"
        "<div class='header'>"
        "<div class='company-info'><h1>" + company_name + "</h1></div>"
        "<div class='document-title'><h2>Party Challan Report</h2>"
        "<p>Status: <strong style='text-transform:capitalize'>" + challan.status + "</strong></p></div>"
        "</div>"
        "<div class='info-grid'>"
        "<div class='info-box'><h3>Challan Details</h3>"
        "<p><strong>Challan No:</strong> " + challan.challan_number + "</p>"
        "<p><strong>Date:</strong> " + str(challan.challan_date) + "</p>"
        "<p><strong>Working Days:</strong> " + str(challan.working_days or "N/A") + "</p></div>"
        "<div class='info-box'><h3>Dispatch Summary</h3>"
        "<p><strong>Total Deliveries:</strong> " + str(len(sorted_dcs)) + "</p>"
        "<p><strong>Last Dispatch:</strong> " + last_dispatch + "</p></div>"
        "</div>"
        "<div class='section-title'>Item Progress</div>"
        "<table><thead><tr><th>Item Name</th><th>Process</th>"
        "<th class='text-right'>Ordered</th><th class='text-right'>Delivered</th>"
        "<th class='text-right'>Pending</th><th class='text-center'>Progress</th>"
        "</tr></thead><tbody>" + item_rows + "</tbody></table>"
        "<div class='section-title'>Delivery Challans (Dispatches)</div>"
        "<table><thead><tr><th>Challan No</th><th>Date</th><th>Status</th><th>Vehicle No</th></tr></thead>"
        "<tbody>" + dc_rows + "</tbody></table>"
        "<div style='text-align:center;margin-top:40px'>"
        "<button onclick='window.print()' style='padding:10px 20px;background:#4F46E5;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold'>Print Report</button>"
        "</div>"
        "<script>window.onload=function(){window.print();}</script>"
        "</body></html>"
    )

    return Response(
        content=html,
        media_type="text/html",
        headers={"Content-Disposition": f"inline; filename=Report-{challan.challan_number}.html"}
    )


class ReportIssueRequest(BaseModel):
    client_status: str
    client_notes: Optional[str] = None

@router.post("/delivery-challans/{challan_id}/report-issue")
def report_delivery_issue(
    challan_id: int,
    data: ReportIssueRequest,
    client: ClientLogin = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    challan = db.query(DeliveryChallan).filter(
        DeliveryChallan.id == challan_id,
        DeliveryChallan.party_id == client.party_id,
        DeliveryChallan.is_active == True
    ).first()

    if not challan:
        raise HTTPException(status_code=404, detail="Delivery Challan not found")

    if data.client_status not in ["pending", "accepted", "discrepancy"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    challan.client_status = data.client_status
    if data.client_notes is not None:
        challan.client_notes = data.client_notes

    db.commit()
    db.refresh(challan)

    if data.client_status == "discrepancy":
        try:
            from app.services.notification_service import create_notification
            create_notification(
                db=db,
                company_id=challan.company_id,
                title=f"Issue Reported on DC-{challan.challan_number}",
                message=f"Client reported an issue: {data.client_notes}",
                type="warning"
            )
        except Exception as e:
            print(f"[Client Portal] Failed to send discrepancy notification: {e}")

    return {"message": "Status updated successfully", "client_status": challan.client_status}
