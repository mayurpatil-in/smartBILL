from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from decimal import Decimal

from app.database.session import get_db
from app.models.delivery_challan import DeliveryChallan
from app.models.delivery_challan_item import DeliveryChallanItem
from app.models.party_challan import PartyChallan
from app.models.party_challan_item import PartyChallanItem
from app.models.stock_transaction import StockTransaction
from app.schemas.challan import ChallanCreate, ChallanResponse, ChallanUpdate
from app.core.dependencies import get_company_id, get_active_financial_year
from app.utils.stock import get_current_stock

router = APIRouter(prefix="/challan", tags=["Delivery Challan"])


def generate_challan_number(db: Session, company_id: int, fy_id: int) -> str:
    """Generate next challan number for the company and financial year"""
    # Get all challan numbers for this company/FY
    # We use a robust way: Get the highest number currently in use
    # We filter by company/FY because usually challan numbers reset per FY
    # BUT if the DB constraint is global (unique challan_number), we must ensure global uniqueness OR fix the constraint
    # Let's assume we want per-FY sequence (DC-2324-001) or just simple DC-001. 
    # Current logic: DC-001.
    
    # Query by Company and FY to generate sequential numbers for each FY
    # Now that we have a composite unique constraint (company_id, fy_id, number), this is safe
    last_challan = (
        db.query(DeliveryChallan)
        .filter(
            DeliveryChallan.company_id == company_id,
            DeliveryChallan.financial_year_id == fy_id
        )
        .order_by(DeliveryChallan.id.desc())
        .first()
    )
    
    if last_challan and last_challan.challan_number:
        try:
            # Extract number from format like "DC-001"
            parts = last_challan.challan_number.split("-")
            last_num = int(parts[-1])
            next_num = last_num + 1
        except:
            next_num = 1
    else:
        next_num = 1
    
    return f"DC-{next_num:03d}"


@router.post("/", response_model=ChallanResponse)
def create_challan(
    data: ChallanCreate,
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    # Generate challan number
    challan_number = generate_challan_number(db, company_id, fy.id)
    
    challan = DeliveryChallan(
        company_id=company_id,
        financial_year_id=fy.id,
        party_id=data.party_id,
        challan_number=challan_number,
        challan_date=data.challan_date,
        vehicle_number=data.vehicle_number,
        notes=data.notes,
        status=data.status or "draft"
    )

    db.add(challan)
    db.flush()  # get challan.id

    for item_data in data.items:
        # Get party challan item to find item_id
        pc_item = db.query(PartyChallanItem).get(item_data.party_challan_item_id)
        if not pc_item:
            raise HTTPException(
                status_code=404,
                detail=f"Party challan item {item_data.party_challan_item_id} not found"
            )
        
        # No stock check needed - items are being delivered back from party
        
        # Create delivery challan item with quality tracking
        challan_item = DeliveryChallanItem(
            challan_id=challan.id,
            party_challan_item_id=item_data.party_challan_item_id,
            process_id=pc_item.process_id,  # Copy process_id from party challan item
            ok_qty=item_data.ok_qty,
            cr_qty=item_data.cr_qty,
            mr_qty=item_data.mr_qty,
            quantity=item_data.quantity
        )
        db.add(challan_item)

        # Update party challan item delivered quantity
        pc_item.quantity_delivered += Decimal(str(item_data.quantity))
        
        # Update party challan status based on delivery progress
        party_challan = pc_item.party_challan
        if party_challan:
            # Calculate total ordered and delivered for all items in this party challan
            total_ordered = sum(float(item.quantity_ordered) for item in party_challan.items)
            total_delivered = sum(float(item.quantity_delivered) for item in party_challan.items)
            
            # Update status based on delivery percentage
            if total_delivered == 0:
                party_challan.status = "open"
            elif total_delivered >= total_ordered:
                party_challan.status = "completed"
            else:
                party_challan.status = "partial"

        # Create stock transaction - IN because items are coming back
        stock_tx = StockTransaction(
            company_id=company_id,
            financial_year_id=fy.id,
            item_id=pc_item.item_id,
            quantity=item_data.quantity,
            transaction_type="IN",  # Changed from OUT to IN
            reference_type="DELIVERY_CHALLAN",
            reference_id=challan.id
        )
        db.add(stock_tx)

    db.commit()
    
    # Reload with relationships
    challan = db.query(DeliveryChallan).options(
        joinedload(DeliveryChallan.party),
        joinedload(DeliveryChallan.items).joinedload(DeliveryChallanItem.party_challan_item).joinedload(PartyChallanItem.party_challan),
        joinedload(DeliveryChallan.items).joinedload(DeliveryChallanItem.party_challan_item).joinedload(PartyChallanItem.item),
        joinedload(DeliveryChallan.items).joinedload(DeliveryChallanItem.party_challan_item).joinedload(PartyChallanItem.process),
        joinedload(DeliveryChallan.items).joinedload(DeliveryChallanItem.process)
    ).filter(DeliveryChallan.id == challan.id).first()
    
    # Manual serialization
    return {
        "id": challan.id,
        "challan_number": challan.challan_number,
        "challan_date": challan.challan_date,
        "party_id": challan.party_id,
        "company_id": challan.company_id,
        "financial_year_id": challan.financial_year_id,
        "vehicle_number": challan.vehicle_number,
        "notes": challan.notes,
        "status": challan.status,
        "is_active": challan.is_active,
        "party": {
            "id": challan.party.id,
            "name": challan.party.name
        } if challan.party else None,
        "items": [
            {
                "id": item.id,
                "party_challan_item_id": item.party_challan_item_id,
                "ok_qty": float(item.ok_qty),
                "cr_qty": float(item.cr_qty),
                "mr_qty": float(item.mr_qty),
                "quantity": float(item.quantity),
                "item": {
                    "id": item.party_challan_item.item.id,
                    "name": item.party_challan_item.item.name
                } if item.party_challan_item and item.party_challan_item.item else None,
                "process": {
                    "id": item.process.id,
                    "name": item.process.name
                } if item.process else None,
                "party_challan_item": {
                    "id": item.party_challan_item.id,
                    "party_challan_id": item.party_challan_item.party_challan_id,
                    "quantity_ordered": float(item.party_challan_item.quantity_ordered),
                    "quantity_delivered": float(item.party_challan_item.quantity_delivered),
                    "party_challan": {
                        "challan_number": item.party_challan_item.party_challan.challan_number
                    } if item.party_challan_item.party_challan else None
                } if item.party_challan_item else None
            }
            for item in challan.items
        ]
    }


@router.get("/", response_model=List[ChallanResponse])
def list_challans(
    party_id: int = None,
    status: str = None,
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    query = db.query(DeliveryChallan).options(
        joinedload(DeliveryChallan.party),
        joinedload(DeliveryChallan.items).joinedload(DeliveryChallanItem.party_challan_item).joinedload(PartyChallanItem.party_challan),
        joinedload(DeliveryChallan.items).joinedload(DeliveryChallanItem.party_challan_item).joinedload(PartyChallanItem.item),
        joinedload(DeliveryChallan.items).joinedload(DeliveryChallanItem.party_challan_item).joinedload(PartyChallanItem.process),
        joinedload(DeliveryChallan.items).joinedload(DeliveryChallanItem.process)
    ).filter(
        DeliveryChallan.company_id == company_id,
        DeliveryChallan.financial_year_id == fy.id
    )
    
    if party_id:
        query = query.filter(DeliveryChallan.party_id == party_id)
    
    if status:
        query = query.filter(DeliveryChallan.status == status)
    
    challans = query.order_by(DeliveryChallan.id.desc()).all()
    
    # Manual serialization
    response_data = []
    for challan in challans:
        response_data.append({
            "id": challan.id,
            "challan_number": challan.challan_number,
            "challan_date": challan.challan_date,
            "party_id": challan.party_id,
            "company_id": challan.company_id,
            "financial_year_id": challan.financial_year_id,
            "vehicle_number": challan.vehicle_number,
            "notes": challan.notes,
            "status": challan.status,
            "is_active": challan.is_active,
            "party": {
                "id": challan.party.id,
                "name": challan.party.name
            } if challan.party else None,
            "items": [
                {
                    "id": item.id,
                    "party_challan_item_id": item.party_challan_item_id,
                    "ok_qty": float(item.ok_qty),
                    "cr_qty": float(item.cr_qty),
                    "mr_qty": float(item.mr_qty),
                    "quantity": float(item.quantity),
                    "item": {
                        "id": item.party_challan_item.item.id,
                        "name": item.party_challan_item.item.name
                    } if item.party_challan_item and item.party_challan_item.item else None,
                    "process": {
                        "id": item.process.id,
                        "name": item.process.name
                    } if item.process else None,
                    "party_challan_item": {
                        "id": item.party_challan_item.id,
                        "party_challan_id": item.party_challan_item.party_challan_id,
                        "party_challan": {
                            "challan_number": item.party_challan_item.party_challan.challan_number
                        } if item.party_challan_item.party_challan else None
                    } if item.party_challan_item else None
                }
                for item in challan.items
            ]
        })
    
    return response_data


@router.get("/next-number/preview")
def get_next_challan_number(
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    """Get the next challan number that will be generated"""
    next_number = generate_challan_number(db, company_id, fy.id)
    return {"next_challan_number": next_number}


@router.delete("/{challan_id}")
def delete_challan(
    challan_id: int,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    challan = db.query(DeliveryChallan).filter(
        DeliveryChallan.id == challan_id,
        DeliveryChallan.company_id == company_id
    ).first()
    
    if not challan:
        raise HTTPException(status_code=404, detail="Delivery Challan not found")
    
    # Reverse party challan delivered quantities
    for item in challan.items:
        if item.party_challan_item_id:
            pc_item = db.query(PartyChallanItem).get(item.party_challan_item_id)
            if pc_item:
                pc_item.quantity_delivered -= Decimal(str(item.quantity))
                
                # Update party challan status after reversing delivery
                party_challan = pc_item.party_challan
                if party_challan:
                    total_ordered = sum(float(i.quantity_ordered) for i in party_challan.items)
                    total_delivered = sum(float(i.quantity_delivered) for i in party_challan.items)
                    
                    if total_delivered == 0:
                        party_challan.status = "open"
                    elif total_delivered >= total_ordered:
                        party_challan.status = "completed"
                    else:
                        party_challan.status = "partial"
    
    # Delete stock transactions
    db.query(StockTransaction).filter(
        StockTransaction.reference_type == "DELIVERY_CHALLAN",
        StockTransaction.reference_id == challan_id
    ).delete()
    
    # Delete challan items
    db.query(DeliveryChallanItem).filter(
        DeliveryChallanItem.challan_id == challan_id
    ).delete()
    
    # Delete challan
    db.delete(challan)
    db.commit()
    
    return {"message": "Delivery Challan deleted successfully"}


# ===============================
# PDF Generation
# ===============================
from fastapi.responses import Response
from jinja2 import Environment, FileSystemLoader
from app.services.pdf_service import generate_pdf
from app.models.company import Company
import os

# Set up Jinja2
templates_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
env = Environment(loader=FileSystemLoader(templates_dir))

@router.get("/{challan_id}/print")
async def print_challan(
    challan_id: int,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    # Fetch challan
    challan = db.query(DeliveryChallan).options(
        joinedload(DeliveryChallan.party),
        joinedload(DeliveryChallan.items).joinedload(DeliveryChallanItem.party_challan_item).joinedload(PartyChallanItem.item),
        joinedload(DeliveryChallan.items).joinedload(DeliveryChallanItem.party_challan_item).joinedload(PartyChallanItem.party_challan),
        joinedload(DeliveryChallan.items).joinedload(DeliveryChallanItem.process)
    ).filter(
        DeliveryChallan.id == challan_id,
        DeliveryChallan.company_id == company_id
    ).first()
    
    if not challan:
        raise HTTPException(status_code=404, detail="Delivery Challan not found")
    
    # Fetch company
    company = db.query(Company).filter(Company.id == company_id).first()
    
    # Calculate Total Qty
    total_qty = sum(float(item.quantity) for item in challan.items)
    
    # Render Template
    template = env.get_template("delivery_challan.html")
    html = template.render(
        challan=challan,
        company=company,
        party=challan.party,
        items=challan.items,
        total_qty=total_qty
    )
    
    # Generate PDF
    pdf_content = await generate_pdf(html)
    
    # Return PDF
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=DC-{challan.challan_number}.pdf"}
    )
