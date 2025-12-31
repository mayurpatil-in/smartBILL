from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session, joinedload
from jinja2 import Environment, FileSystemLoader
import os

from app.database.session import get_db
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.company import Company
from app.core.dependencies import get_company_id
from app.services.pdf_service import generate_pdf

router = APIRouter(prefix="/invoice", tags=["Invoice PDF"])

# Set up Jinja2
templates_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
env = Environment(loader=FileSystemLoader(templates_dir))


@router.get("/{invoice_id}/pdf")
async def download_invoice_pdf(
    invoice_id: int,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    # Fetch invoice with relationships
    invoice = db.query(Invoice).options(
        joinedload(Invoice.party),
        joinedload(Invoice.financial_year),
        joinedload(Invoice.items).joinedload(InvoiceItem.item)
    ).filter(
        Invoice.id == invoice_id,
        Invoice.company_id == company_id
    ).first()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    company = db.query(Company).get(company_id)

    # Render Template
    template = env.get_template("invoice.html")
    html = template.render(
        invoice=invoice,
        company=company,
        party=invoice.party,
        items=invoice.items
    )

    # Generate PDF
    pdf_content = await generate_pdf(html)

    # Return PDF
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=Invoice-{invoice.id}.pdf"}
    )
