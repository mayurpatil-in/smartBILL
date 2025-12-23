from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.invoice import Invoice
from app.models.company import Company
from app.models.party import Party
from app.core.dependencies import get_company_id
from app.utils.pdf import generate_invoice_pdf

router = APIRouter(prefix="/invoice", tags=["Invoice PDF"])


@router.get("/{invoice_id}/pdf")
def download_invoice_pdf(
    invoice_id: int,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.company_id == company_id
    ).first()

    company = db.query(Company).get(company_id)
    party = db.query(Party).get(invoice.party_id)

    file_path = f"invoice_{invoice_id}.pdf"

    generate_invoice_pdf(invoice, company, party, file_path)

    return FileResponse(file_path, filename=file_path)
