from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session, joinedload
from fastapi.responses import Response
from jinja2 import Environment, FileSystemLoader, select_autoescape
import os

from app.database.session import get_db
from app.models.delivery_challan import DeliveryChallan
from app.models.delivery_challan_item import DeliveryChallanItem
from app.models.party_challan_item import PartyChallanItem
from app.models.company import Company
from app.services.pdf_service import generate_pdf

router = APIRouter(prefix="/public/challan", tags=["Public Challan"])

# Set up Jinja2 (Same as challan.py)
templates_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
env = Environment(
    loader=FileSystemLoader(templates_dir),
    autoescape=select_autoescape(['html', 'xml'])
)

from app.core.security import verify_url_signature

@router.get("/{challan_id}/download")
async def public_download_challan(
    challan_id: int,
    token: str,
    db: Session = Depends(get_db)
):
    """
    Public endpoint to download a delivery challan PDF.
    This is intended to be accessed via QR Code.
    """
    # 🔒 Verify Signature
    if not verify_url_signature(str(challan_id), token):
        raise HTTPException(status_code=403, detail="Invalid or expired download link")

    # Fetch challan
    challan = db.query(DeliveryChallan).options(
        joinedload(DeliveryChallan.party),
        joinedload(DeliveryChallan.items).joinedload(DeliveryChallanItem.party_challan_item).joinedload(PartyChallanItem.item),
        joinedload(DeliveryChallan.items).joinedload(DeliveryChallanItem.party_challan_item).joinedload(PartyChallanItem.party_challan),
        joinedload(DeliveryChallan.items).joinedload(DeliveryChallanItem.process)
    ).filter(
        DeliveryChallan.id == challan_id
    ).first()
    
    if not challan:
        raise HTTPException(status_code=404, detail="Delivery Challan not found")
    
    # Fetch company
    company = db.query(Company).filter(Company.id == challan.company_id).first()
    
    # Calculate Total Qty
    total_qty = sum(float(item.quantity) for item in challan.items)
    
    # Render Template
    # We pass qr_code=None to avoid recursive QR generation (or we could include it)
    # The printed version already has the QR. When downloading the "original", it should probably also have it.
    # But for simplicity, let's include a static message or simpler QR if needed.
    # Let's regenerate the QR so the downloaded PDF is identical to the printed one.
    
    import qrcode
    import io
    import base64

    # Use the same PUBLIC URL for the QR code in the downloaded PDF
    # In a real app, use settings.BASE_URL
    # For now, we will just replicate the data content or the same URL
    # qr_content = f"{request.base_url}public/challan/{challan.id}/download"
    # To avoid 'request' dependency issues here, let's stick to the data content or similar
    
    qr_data = f"Challan: {challan.challan_number}\nDate: {challan.challan_date}\nParty: {challan.party.name if challan.party else 'N/A'}\nItems: {len(challan.items)}"
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(qr_data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    qr_code_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

    template = env.get_template("delivery_challan.html")
    html = template.render(
        challan=challan,
        company=company,
        party=challan.party,
        items=challan.items,
        total_qty=total_qty,
        qr_code=qr_code_b64
    )
    
    # Generate PDF
    pdf_content = await generate_pdf(html)
    
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=DC-{challan.challan_number}.pdf"}
    )
