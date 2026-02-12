from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload
from jinja2 import Environment, FileSystemLoader
import os
import qrcode
import io
import base64

from app.database.session import get_db
from app.models.item import Item
from app.models.user import User, UserRole
from app.models.delivery_challan_item import DeliveryChallanItem
from app.models.invoice_item import InvoiceItem
from app.schemas.item import ItemCreate, ItemResponse
from app.services.pdf_service import generate_pdf
from app.core.dependencies import get_company_id, get_active_financial_year, require_role

# Set up Jinja2
templates_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
env = Environment(loader=FileSystemLoader(templates_dir))

router = APIRouter(prefix="/item", tags=["Item"])


@router.post("/", response_model=ItemResponse)
def create_item(
    data: ItemCreate,
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)),
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    item = Item(
        company_id=company_id, 
        financial_year_id=fy.id,
        **data.dict()
    )

    db.add(item)
    db.commit()
    db.refresh(item)

    return item


@router.get("/", response_model=list[ItemResponse])
def list_items(
    party_id: int = None,
    barcode: str = None,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    query = db.query(Item).options(
        joinedload(Item.process)
    ).filter(
        Item.company_id == company_id
    )
    
    if party_id:
        query = query.filter(Item.party_id == party_id)
        
    if barcode:
        query = query.filter(Item.barcode == barcode)

    return query.all()


@router.put("/{item_id}", response_model=ItemResponse)
def update_item(
    item_id: int,
    data: ItemCreate,
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)),
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    item = db.query(Item).filter(
        Item.id == item_id,
        Item.company_id == company_id
    ).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )

    for key, value in data.dict().items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(
    item_id: int,
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)),
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    item = db.query(Item).filter(
        Item.id == item_id,
        Item.company_id == company_id
    ).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )

    # Check if item is used in any delivery challan
    challan_usage = db.query(DeliveryChallanItem).filter(
        DeliveryChallanItem.item_id == item_id
    ).first()

    if challan_usage:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete item '{item.name}': It is used in one or more delivery challans. Please remove it from all challans first."
        )

    # Check if item is used in any invoice
    invoice_usage = db.query(InvoiceItem).filter(
        InvoiceItem.item_id == item_id
    ).first()

    if invoice_usage:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete item '{item.name}': It is used in one or more invoices. Please remove it from all invoices first."
        )

    # If no usage found, safe to delete
    db.delete(item)
    db.commit()


@router.get("/{item_id}/print-barcode")
async def print_item_barcode(
    item_id: int,
    count: int = 1,
    format: str = "thermal",
    date: str = None,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    try:
        item = db.query(Item).options(
            joinedload(Item.company)
        ).filter(
            Item.id == item_id,
            Item.company_id == company_id
        ).first()

        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item not found"
            )
        
        if not item.barcode:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Item does not have a barcode"
            )

        # Generate QR Code
        qr = qrcode.QRCode(version=1, box_size=10, border=1)
        qr.add_data(item.barcode)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        qr_code_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

        # Format date if provided
        formatted_date = None
        if date:
            try:
                # Expecting YYYY-MM-DD from frontend date input
                from datetime import datetime
                dt = datetime.strptime(date, "%Y-%m-%d")
                formatted_date = dt.strftime("%d/%m/%Y")
            except ValueError:
                formatted_date = date # Fallback or keep as is

        # Render Template
        template = env.get_template("item_barcode.html")
        html_content = template.render(
            item=item,
            qr_code=qr_code_b64,
            count=count,
            format=format,
            date=formatted_date,
            company_name=item.company.name if item.company else "SmartBill",
            rate=f"{item.rate:.2f}" if item.rate else "0.00"
        )

        pdf_options = {
            "print_background": True,
            "margin": {"top": "0", "right": "0", "bottom": "0", "left": "0"},
        }

        if format == "a4":
            pdf_options.update({
                "format": "A4",
                "margin": {"top": "5mm", "right": "5mm", "bottom": "5mm", "left": "5mm"},
            })
        else:
            # Thermal defaults
            pdf_options.update({
                "width": "50mm",
                "height": "25mm",
            })

        # print(f"[DEBUG] Calling generate_pdf with options: {pdf_options}")
        pdf_content = await generate_pdf(html_content, pdf_options)
        # print(f"[DEBUG] PDF generated successfully, size: {len(pdf_content)} bytes")

        return Response(
            content=pdf_content,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=barcode_{item.barcode}_{format}.pdf"}
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Error generating barcode PDF: {e}")
        # import traceback
        # traceback.print_exc()
            
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate PDF: {str(e)}"
        )
