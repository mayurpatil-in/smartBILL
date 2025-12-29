from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List

from app.database.session import get_db
from app.models.party_challan import PartyChallan
from app.models.party_challan_item import PartyChallanItem
from app.schemas.party_challan import (
    PartyChallanCreate,
    PartyChallanResponse,
    PartyChallanUpdate,
    DeliveryProgress
)
from app.core.dependencies import get_company_id, get_active_financial_year

router = APIRouter(prefix="/party-challan", tags=["Party Challan"])


def generate_party_challan_number(db: Session, company_id: int, fy_id: int) -> str:
    """Generate next party challan number for the company and financial year"""
    last_challan = (
        db.query(PartyChallan)
        .filter(
            PartyChallan.company_id == company_id,
            PartyChallan.financial_year_id == fy_id
        )
        .order_by(PartyChallan.id.desc())
        .first()
    )
    
    if last_challan and last_challan.challan_number:
        try:
            last_num = int(last_challan.challan_number.split("-")[1])
            next_num = last_num + 1
        except:
            next_num = 1
    else:
        next_num = 1
    
    return f"PC-{next_num:03d}"


@router.post("/", response_model=PartyChallanResponse)
def create_party_challan(
    data: PartyChallanCreate,
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    # Check if challan number already exists for this party in this financial year
    if data.challan_number:
        existing = db.query(PartyChallan).filter(
            PartyChallan.challan_number == data.challan_number,
            PartyChallan.party_id == data.party_id,  # Party specific
            PartyChallan.company_id == company_id,
            PartyChallan.financial_year_id == fy.id  # Financial year specific
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Challan number '{data.challan_number}' already exists for this party in this financial year"
            )
        challan_number = data.challan_number
    else:
        # Auto-generate if not provided
        challan_number = generate_party_challan_number(db, company_id, fy.id)
    
    party_challan = PartyChallan(
        company_id=company_id,
        financial_year_id=fy.id,
        party_id=data.party_id,
        challan_number=challan_number,
        challan_date=data.challan_date,
        working_days=data.working_days,
        notes=data.notes,
        status="open"
    )

    db.add(party_challan)
    
    try:
        db.flush()  # get party_challan.id
    except Exception as e:
        db.rollback()
        if "duplicate key" in str(e).lower() or "unique constraint" in str(e).lower():
            raise HTTPException(
                status_code=400,
                detail=f"Challan number '{challan_number}' already exists"
            )
        raise

    for item in data.items:
        pc_item = PartyChallanItem(
            party_challan_id=party_challan.id,
            item_id=item.item_id,
            process_id=item.process_id,
            quantity_ordered=item.quantity_ordered,
            quantity_delivered=0,
            rate=item.rate
        )
        db.add(pc_item)

    db.commit()
    db.refresh(party_challan)
    
    # Reload with relationships
    challan = db.query(PartyChallan).options(
        joinedload(PartyChallan.party),
        joinedload(PartyChallan.items).joinedload(PartyChallanItem.item),
        joinedload(PartyChallan.items).joinedload(PartyChallanItem.process)
    ).filter(PartyChallan.id == party_challan.id).first()
    
    # Convert to dict to avoid serialization issues
    response_data = {
        "id": challan.id,
        "challan_number": challan.challan_number,
        "challan_date": challan.challan_date,
        "party_id": challan.party_id,
        "company_id": challan.company_id,
        "financial_year_id": challan.financial_year_id,
        "working_days": challan.working_days,
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
                "item_id": item.item_id,
                "process_id": item.process_id,
                "quantity_ordered": float(item.quantity_ordered),
                "quantity_delivered": float(item.quantity_delivered),
                "rate": float(item.rate) if item.rate else None,
                "item": {
                    "id": item.item.id,
                    "name": item.item.name
                } if item.item else None,
                "process": {
                    "id": item.process.id,
                    "name": item.process.name
                } if item.process else None
            }
            for item in challan.items
        ]
    }
    
    return response_data


@router.get("/", response_model=List[PartyChallanResponse])
def list_party_challans(
    party_id: int = None,
    status: str = None,
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    query = db.query(PartyChallan).options(
        joinedload(PartyChallan.party),
        joinedload(PartyChallan.items).joinedload(PartyChallanItem.item),
        joinedload(PartyChallan.items).joinedload(PartyChallanItem.process)
    ).filter(
        PartyChallan.company_id == company_id,
        PartyChallan.financial_year_id == fy.id
    )
    
    if party_id:
        query = query.filter(PartyChallan.party_id == party_id)
    
    if status:
        query = query.filter(PartyChallan.status == status)
    
    challans = query.order_by(PartyChallan.challan_date.desc()).all()
    
    # Convert to dict to avoid serialization issues
    response_data = []
    for challan in challans:
        response_data.append({
            "id": challan.id,
            "challan_number": challan.challan_number,
            "challan_date": challan.challan_date,
            "party_id": challan.party_id,
            "company_id": challan.company_id,
            "financial_year_id": challan.financial_year_id,
            "working_days": challan.working_days,
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
                    "item_id": item.item_id,
                    "process_id": item.process_id,
                    "quantity_ordered": float(item.quantity_ordered),
                    "quantity_delivered": float(item.quantity_delivered),
                    "rate": float(item.rate) if item.rate else None,
                    "item": {
                        "id": item.item.id,
                        "name": item.item.name
                    } if item.item else None,
                    "process": {
                        "id": item.process.id,
                        "name": item.process.name
                    } if item.process else None
                }
                for item in challan.items
            ]
        })
    
    return response_data


@router.get("/{challan_id}", response_model=PartyChallanResponse)
def get_party_challan(
    challan_id: int,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    challan = db.query(PartyChallan).options(
        joinedload(PartyChallan.party),
        joinedload(PartyChallan.items).joinedload(PartyChallanItem.item),
        joinedload(PartyChallan.items).joinedload(PartyChallanItem.process)
    ).filter(
        PartyChallan.id == challan_id,
        PartyChallan.company_id == company_id
    ).first()
    
    if not challan:
        raise HTTPException(status_code=404, detail="Party Challan not found")
    
    # Convert to dict
    return {
        "id": challan.id,
        "challan_number": challan.challan_number,
        "challan_date": challan.challan_date,
        "party_id": challan.party_id,
        "company_id": challan.company_id,
        "financial_year_id": challan.financial_year_id,
        "working_days": challan.working_days,
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
                "item_id": item.item_id,
                "process_id": item.process_id,
                "quantity_ordered": float(item.quantity_ordered),
                "quantity_delivered": float(item.quantity_delivered),
                "rate": float(item.rate) if item.rate else None,
                "item": {
                    "id": item.item.id,
                    "name": item.item.name
                } if item.item else None,
                "process": {
                    "id": item.process.id,
                    "name": item.process.name
                } if item.process else None
            }
            for item in challan.items
        ]
    }


@router.put("/{challan_id}", response_model=PartyChallanResponse)
def update_party_challan(
    challan_id: int,
    data: PartyChallanUpdate,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    challan = db.query(PartyChallan).filter(
        PartyChallan.id == challan_id,
        PartyChallan.company_id == company_id
    ).first()
    
    if not challan:
        raise HTTPException(status_code=404, detail="Party Challan not found")
    
    # Update basic fields
    if data.party_id is not None:
        challan.party_id = data.party_id
    if data.challan_date is not None:
        challan.challan_date = data.challan_date
    if data.working_days is not None:
        challan.working_days = data.working_days
    if data.notes is not None:
        challan.notes = data.notes
    if data.status is not None:
        challan.status = data.status
    if data.is_active is not None:
        challan.is_active = data.is_active
    
    # Update items if provided
    if data.items is not None:
        # Delete existing items
        db.query(PartyChallanItem).filter(
            PartyChallanItem.party_challan_id == challan_id
        ).delete()
        
        # Add new items
        for item in data.items:
            pc_item = PartyChallanItem(
                party_challan_id=challan.id,
                item_id=item.item_id,
                process_id=item.process_id,
                quantity_ordered=item.quantity_ordered,
                quantity_delivered=0,
                rate=item.rate
            )
            db.add(pc_item)
    
    
    db.commit()
    db.refresh(challan)
    
    # Reload with relationships
    challan = db.query(PartyChallan).options(
        joinedload(PartyChallan.party),
        joinedload(PartyChallan.items).joinedload(PartyChallanItem.item),
        joinedload(PartyChallan.items).joinedload(PartyChallanItem.process)
    ).filter(PartyChallan.id == challan_id).first()
    
    # Convert to dict to avoid serialization issues
    return {
        "id": challan.id,
        "challan_number": challan.challan_number,
        "challan_date": challan.challan_date,
        "party_id": challan.party_id,
        "company_id": challan.company_id,
        "financial_year_id": challan.financial_year_id,
        "working_days": challan.working_days,
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
                "item_id": item.item_id,
                "process_id": item.process_id,
                "quantity_ordered": float(item.quantity_ordered),
                "quantity_delivered": float(item.quantity_delivered),
                "rate": float(item.rate) if item.rate else None,
                "item": {
                    "id": item.item.id,
                    "name": item.item.name
                } if item.item else None,
                "process": {
                    "id": item.process.id,
                    "name": item.process.name
                } if item.process else None
            }
            for item in challan.items
        ]
    }


@router.delete("/{challan_id}")
def delete_party_challan(
    challan_id: int,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    challan = db.query(PartyChallan).filter(
        PartyChallan.id == challan_id,
        PartyChallan.company_id == company_id
    ).first()
    
    if not challan:
        raise HTTPException(status_code=404, detail="Party Challan not found")
    
    # Check if there are linked delivery challans
    from app.models.delivery_challan import DeliveryChallan
    linked_deliveries = db.query(DeliveryChallan).filter(
        DeliveryChallan.party_challan_id == challan_id
    ).count()
    
    if linked_deliveries > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete. {linked_deliveries} delivery challan(s) are linked to this party challan."
        )
    
    # Delete items
    db.query(PartyChallanItem).filter(
        PartyChallanItem.party_challan_id == challan_id
    ).delete()
    
    # Delete challan
    db.delete(challan)
    db.commit()
    
    return {"message": "Party Challan deleted successfully"}


@router.get("/{challan_id}/delivery-progress", response_model=DeliveryProgress)
def get_delivery_progress(
    challan_id: int,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Get delivery progress for a party challan"""
    challan = db.query(PartyChallan).options(
        joinedload(PartyChallan.items).joinedload(PartyChallanItem.item)
    ).filter(
        PartyChallan.id == challan_id,
        PartyChallan.company_id == company_id
    ).first()
    
    if not challan:
        raise HTTPException(status_code=404, detail="Party Challan not found")
    
    items_progress = []
    total_ordered = 0
    total_delivered = 0
    
    for pc_item in challan.items:
        ordered = float(pc_item.quantity_ordered)
        delivered = float(pc_item.quantity_delivered)
        remaining = ordered - delivered
        
        total_ordered += ordered
        total_delivered += delivered
        
        items_progress.append({
            "item_id": pc_item.item_id,
            "item_name": pc_item.item.name if pc_item.item else "Unknown",
            "quantity_ordered": ordered,
            "quantity_delivered": delivered,
            "quantity_remaining": remaining,
            "percentage": (delivered / ordered * 100) if ordered > 0 else 0
        })
    
    overall_percentage = (total_delivered / total_ordered * 100) if total_ordered > 0 else 0
    
    return DeliveryProgress(
        party_challan_id=challan.id,
        challan_number=challan.challan_number,
        total_items=len(challan.items),
        items_progress=items_progress,
        overall_percentage=overall_percentage
    )


@router.get("/next-number/preview")
def get_next_party_challan_number(
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    """Get the next party challan number that will be generated"""
    next_number = generate_party_challan_number(db, company_id, fy.id)
    return {"next_challan_number": next_number}
