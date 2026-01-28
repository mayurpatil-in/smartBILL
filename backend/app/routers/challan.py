from fastapi import APIRouter, Depends, HTTPException, Request
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


def generate_challan_number(db: Session, company_id: int, fy_id: int, party_id: int) -> str:
    """Generate next challan number for the company, financial year, and party"""
    # Get all challan numbers for this company/FY/Party
    last_challan = (
        db.query(DeliveryChallan)
        .filter(
            DeliveryChallan.company_id == company_id,
            DeliveryChallan.financial_year_id == fy_id,
            DeliveryChallan.party_id == party_id
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
    # Generate challan number (Party Wise)
    challan_number = generate_challan_number(db, company_id, fy.id, data.party_id)
    
    challan = DeliveryChallan(
        company_id=company_id,
        financial_year_id=fy.id,
        party_id=data.party_id,
        challan_number=challan_number,
        challan_date=data.challan_date,
        vehicle_number=data.vehicle_number,
        notes=data.notes,
        status=data.status or "sent"
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
            quantity=item_data.quantity,
            rate=item_data.rate
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
            transaction_type="OUT",  # User Feedback: Delivery Challan is OUT (Sending back)
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
                "rate": float(item.rate) if item.rate and item.rate > 0 else (float(item.party_challan_item.rate) if item.party_challan_item and item.party_challan_item.rate and item.party_challan_item.rate > 0 else (float(item.party_challan_item.item.rate) if item.party_challan_item and item.party_challan_item.item and item.party_challan_item.item.rate else 0.0)),
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


@router.put("/{challan_id}", response_model=ChallanResponse)
def update_challan(
    challan_id: int,
    data: ChallanCreate,
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    # Get existing challan
    challan = db.query(DeliveryChallan).options(
        joinedload(DeliveryChallan.items).joinedload(DeliveryChallanItem.party_challan_item)
    ).filter(
        DeliveryChallan.id == challan_id,
        DeliveryChallan.company_id == company_id
    ).first()
    
    if not challan:
        raise HTTPException(status_code=404, detail="Delivery challan not found")
    
    # Step 1: Reverse all old items' quantities
    for old_item in challan.items:
        pc_item = old_item.party_challan_item
        if pc_item:
            # Reduce the delivered quantity
            pc_item.quantity_delivered -= Decimal(str(old_item.quantity))
            
            # Update party challan status
            party_challan = pc_item.party_challan
            if party_challan:
                total_ordered = sum(float(item.quantity_ordered) for item in party_challan.items)
                total_delivered = sum(float(item.quantity_delivered) for item in party_challan.items)
                
                if total_delivered == 0:
                    party_challan.status = "open"
                elif total_delivered >= total_ordered:
                    party_challan.status = "completed"
                else:
                    party_challan.status = "partial"
        
        # Delete stock transaction
        db.query(StockTransaction).filter(
            StockTransaction.reference_type == "DELIVERY_CHALLAN",
            StockTransaction.reference_id == challan.id,
            StockTransaction.item_id == pc_item.item_id if pc_item else None
        ).delete()
    
    # Step 2: Delete all old delivery challan items
    db.query(DeliveryChallanItem).filter(
        DeliveryChallanItem.challan_id == challan.id
    ).delete()
    
    # Step 3: Update challan metadata
    challan.party_id = data.party_id
    challan.challan_date = data.challan_date
    challan.vehicle_number = data.vehicle_number
    challan.notes = data.notes
    challan.status = data.status or "sent"
    
    # Step 4: Add new items (same logic as create)
    for item_data in data.items:
        pc_item = db.query(PartyChallanItem).get(item_data.party_challan_item_id)
        if not pc_item:
            raise HTTPException(
                status_code=404,
                detail=f"Party challan item {item_data.party_challan_item_id} not found"
            )
        
        # Create delivery challan item
        challan_item = DeliveryChallanItem(
            challan_id=challan.id,
            party_challan_item_id=item_data.party_challan_item_id,
            process_id=pc_item.process_id,
            ok_qty=item_data.ok_qty,
            cr_qty=item_data.cr_qty,
            mr_qty=item_data.mr_qty,
            quantity=item_data.quantity,
            rate=item_data.rate
        )
        db.add(challan_item)
        
        # Update party challan item delivered quantity
        pc_item.quantity_delivered += Decimal(str(item_data.quantity))
        
        # Update party challan status
        party_challan = pc_item.party_challan
        if party_challan:
            total_ordered = sum(float(item.quantity_ordered) for item in party_challan.items)
            total_delivered = sum(float(item.quantity_delivered) for item in party_challan.items)
            
            if total_delivered == 0:
                party_challan.status = "open"
            elif total_delivered >= total_ordered:
                party_challan.status = "completed"
            else:
                party_challan.status = "partial"
        
        # Create stock transaction
        stock_tx = StockTransaction(
            company_id=company_id,
            financial_year_id=fy.id,
            item_id=pc_item.item_id,
            quantity=item_data.quantity,
            transaction_type="OUT",
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
    
    # Manual serialization (same as create)
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
                "rate": float(item.rate) if item.rate and item.rate > 0 else (float(item.party_challan_item.rate) if item.party_challan_item and item.party_challan_item.rate and item.party_challan_item.rate > 0 else (float(item.party_challan_item.item.rate) if item.party_challan_item and item.party_challan_item.item and item.party_challan_item.item.rate else 0.0)),
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
                    "rate": float(item.rate) if item.rate and item.rate > 0 else (float(item.party_challan_item.rate) if item.party_challan_item and item.party_challan_item.rate and item.party_challan_item.rate > 0 else (float(item.party_challan_item.item.rate) if item.party_challan_item and item.party_challan_item.item and item.party_challan_item.item.rate else 0.0)),
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


@router.get("/stats")
def get_challan_stats(
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    """Get statistics for delivery challans"""
    base_query = db.query(DeliveryChallan).filter(
        DeliveryChallan.company_id == company_id,
        DeliveryChallan.financial_year_id == fy.id
    )
    
    total = base_query.count()
    sent = base_query.filter(DeliveryChallan.status == "sent").count()
    delivered = base_query.filter(DeliveryChallan.status == "delivered").count()
    
    return {
        "total": total,
        "sent": sent,
        "delivered": delivered
    }


@router.get("/next-number/preview")
def get_next_challan_number(
    party_id: int,
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    """Get the next challan number that will be generated"""
    next_number = generate_challan_number(db, company_id, fy.id, party_id)
    return {"next_challan_number": next_number}


@router.get("/pending-items/{party_id}")

def get_pending_challan_items(
    party_id: int,
    invoice_id: int = None,
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    """Get all delivery challan items that are not yet billed"""
    from app.models.invoice_item import InvoiceItem

    from sqlalchemy import func
    from app.models.invoice_item import InvoiceItem

    # 1. Get total billed quantities per challan item
    billed_amounts = db.query(
        InvoiceItem.delivery_challan_item_id,
        func.sum(InvoiceItem.ok_qty).label("billed_ok"),
        func.sum(InvoiceItem.cr_qty).label("billed_cr"),
        func.sum(InvoiceItem.mr_qty).label("billed_mr")
    ).filter(
        InvoiceItem.delivery_challan_item_id != None
    )

    if invoice_id:
        billed_amounts = billed_amounts.filter(InvoiceItem.invoice_id != invoice_id)

    billed_amounts = billed_amounts.group_by(InvoiceItem.delivery_challan_item_id).all()
    
    # Create a map for fast lookup
    billed_map = {
        item.delivery_challan_item_id: {
            "ok": float(item.billed_ok or 0),
            "cr": float(item.billed_cr or 0),
            "mr": float(item.billed_mr or 0)
        } for item in billed_amounts
    }

    # 2. Query All Challan Items for this Party & FY
    items = db.query(DeliveryChallanItem).join(DeliveryChallan).options(
        joinedload(DeliveryChallanItem.party_challan_item).joinedload(PartyChallanItem.item),
        joinedload(DeliveryChallanItem.process)
    ).filter(
        DeliveryChallan.company_id == company_id,
        DeliveryChallan.financial_year_id == fy.id,
        DeliveryChallan.party_id == party_id
    ).all()
    
    pending_items = []
    # 3. Process and Filter Items (WITH AGGREGATION)
    # We group items by (challan_id, item_id, rate) to handle split rows as a single pool
    grouped_items = {}
    
    for item in items:
        # Resolve item object and rate for key
        item_obj = item.party_challan_item.item if item.party_challan_item else None
        item_id = item_obj.id if item_obj else 0
        rate = float(item.rate) if item.rate and item.rate > 0 else 0.0
        
        # Key for grouping: Challan + Item + Rate (Rate must match to merge)
        key = (item.challan_id, item_id, rate)
        
        if key not in grouped_items:
            grouped_items[key] = {
                "item": item, 
                "item_obj": item_obj,
                "ids": [],
                "orig_ok": 0.0,
                "orig_cr": 0.0,
                "orig_mr": 0.0,
                "billed_ok": 0.0,
                "billed_cr": 0.0,
                "billed_mr": 0.0
            }
        
        group = grouped_items[key]
        group["ids"].append(item.id)
        group["orig_ok"] += float(item.ok_qty or 0)
        group["orig_cr"] += float(item.cr_qty or 0)
        group["orig_mr"] += float(item.mr_qty or 0) # Sum MR
        
        # Sum Billed
        b = billed_map.get(item.id, {"ok": 0.0, "cr": 0.0, "mr": 0.0})
        group["billed_ok"] += b["ok"]
        group["billed_cr"] += b["cr"]
        group["billed_mr"] += b["mr"]

    for key, group in grouped_items.items():
        base_item = group["item"]
        item_obj = group["item_obj"]
        
        # Calculate Remaining on AGGREGATE
        rem_ok = group["orig_ok"] - group["billed_ok"]
        rem_cr = group["orig_cr"] - group["billed_cr"]
        rem_mr = group["orig_mr"] - group["billed_mr"]
        
        # Cross-Bucket Deduction
        if rem_cr < 0:
            excess_cr = abs(rem_cr)
            rem_ok -= excess_cr
            rem_cr = 0
            
        rem_ok = max(0.0, rem_ok)
        rem_cr = max(0.0, rem_cr)
        rem_mr = max(0.0, rem_mr)
        
        if rem_ok > 0 or rem_cr > 0 or rem_mr > 0: # Include if MR exists
             pending_items.append({
                 "challan_id": base_item.challan_id,
                 "challan_number": base_item.challan.challan_number,
                 "challan_date": base_item.challan.challan_date,
                 "item_id": item_obj.id if item_obj else None,
                 "item_name": item_obj.name if item_obj else "Unknown",
                 "delivery_challan_item_id": base_item.id, # Primary ID for reference
                 "delivery_challan_item_ids": group["ids"], # List of all IDs for backend logic
                 "ok_qty": rem_ok,
                 "cr_qty": rem_cr,
                 "mr_qty": rem_mr, # Use Remaining MR
                 "quantity": rem_ok + rem_cr + rem_mr, # Total includes Remaining MR
                 "original_ok_qty": group["orig_ok"],
                 "original_cr_qty": group["orig_cr"],
                 "rate": key[2] # The rate from the key
             })

    return pending_items


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
        
    # Check if linked to any Invoice
    from app.models.invoice import Invoice
    from app.models.invoice_item import InvoiceItem
    
    # 1. Direct Link
    linked_invoice = db.query(Invoice).filter(Invoice.challan_id == challan.id).first()
    if linked_invoice:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete challan because it is linked to Invoice {linked_invoice.invoice_number}"
        )
        
    # 2. Item Link
    challan_item_ids = [item.id for item in challan.items]
    if challan_item_ids:
        linked_item = db.query(InvoiceItem).filter(
            InvoiceItem.delivery_challan_item_id.in_(challan_item_ids)
        ).first()
        
        if linked_item:
            # Fetch the linked invoice to see its number
            inv = db.query(Invoice).get(linked_item.invoice_id)
            inv_num = inv.invoice_number if inv else "Unknown"
            
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete challan because items are billed in Invoice {inv_num}"
            )
    
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
    request: Request,
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

    # Generate QR Code
    import qrcode
    import io
    import base64

    # Generate Public Download URL
    from app.core.config import get_backend_url
    from app.core.security import create_url_signature
    
    base_url = get_backend_url()
            
    # Sign the ID to prevent IDOR
    signature = create_url_signature(str(challan_id))
    download_url = f"{base_url}/public/challan/{challan_id}/download?token={signature}"
    
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(download_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    qr_code_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
    
    # Prepare items data with calculated stats (Aggregated by Item Name)
    grouped_data = {}

    for item in challan.items:
        pc_item = item.party_challan_item
        # Group by Item ID to merge same items from different challans
        item_id = pc_item.item_id if pc_item else (item.id if item else "Unknown")
        
        if item_id not in grouped_data:
            grouped_data[item_id] = {
                "item_obj": item, # Store first item for description
                "pc_items": set(), # Track unique party challan items involved
                "ref_challans": {}, # Track unique Ref Challans {pc_id: pc_obj}
                "dispatch": 0.0,
                "ok": 0.0,
                "cr": 0.0,
                "mr": 0.0
            }
        
        # Track the pc_item to sum its ordered/delivered stats later
        if pc_item:
            grouped_data[item_id]["pc_items"].add(pc_item)
            if pc_item.party_challan:
                grouped_data[item_id]["ref_challans"][pc_item.party_challan_id] = pc_item.party_challan

        # Accumulate quantities
        grouped_data[item_id]["dispatch"] += float(item.quantity)
        grouped_data[item_id]["ok"] += float(item.ok_qty)
        grouped_data[item_id]["cr"] += float(item.cr_qty)
        grouped_data[item_id]["mr"] += float(item.mr_qty)

    items_data = []
    # Sort groups by Item Name
    sorted_keys = sorted(grouped_data.keys(), key=lambda k: grouped_data[k]["item_obj"].party_challan_item.item.name if grouped_data[k]["item_obj"].party_challan_item else "")

    for key in sorted_keys:
        data = grouped_data[key]
        current_dispatch = data["dispatch"]
        
        # Calculate stats specific to this Item across ALL involved Party Challans
        if data["pc_items"]:
            # Sum the Ordered/Delivered from ALL referenced Party Challan Items for this product
            item_ordered_total = sum(float(pci.quantity_ordered) for pci in data["pc_items"])
            item_delivered_total = sum(float(pci.quantity_delivered) for pci in data["pc_items"])
            
            # Calculate states: 
            # delivered_total includes current dispatch, so valid ordered balance is total - delivered
            raw_closing_balance = item_ordered_total - item_delivered_total
            
            # Opening balance is what it was BEFORE this dispatch
            # Since current dispatch is included in delivered_total, we add it back to get previous state
            raw_opening_balance = raw_closing_balance + current_dispatch
            
            # Clamp values for display (no negative balances shown)
            opening_qty = max(0, raw_opening_balance)
            balance_qty = max(0, raw_closing_balance)
            
        # Prepare Reference Strings List
        ref_list = []
        for pc_obj in data["ref_challans"].values():
            # Grand Total of that specific Party Challan
            pc_grand_total = int(sum(float(i.quantity_ordered) for i in pc_obj.items))
            ref_str = f"{pc_obj.challan_number} | {pc_obj.challan_date.strftime('%d-%m-%Y')} | {pc_grand_total}"
            ref_list.append(ref_str)
            
        # Proxy object
        class ProxyItem:
            def __init__(self, original, ok, cr, mr):
                self.party_challan_item = original.party_challan_item
                self.process = original.process
                self.ok_qty = int(ok)
                self.cr_qty = int(cr)
                self.mr_qty = int(mr)
                self.rate = original.rate if original.rate and original.rate > 0 else (original.party_challan_item.rate if original.party_challan_item and original.party_challan_item.rate and original.party_challan_item.rate > 0 else (original.party_challan_item.item.rate if original.party_challan_item and original.party_challan_item.item and original.party_challan_item.item.rate else 0.0))
        
        proxy_item_obj = ProxyItem(data["item_obj"], data["ok"], data["cr"], data["mr"])

        items_data.append({
            "item_obj": proxy_item_obj,
            "opening": int(opening_qty),
            "dispatch": int(current_dispatch),
            "balance": int(balance_qty),
            "ref_list": ref_list # Pass list of ref strings
        })

    # Render Template
    template = env.get_template("delivery_challan.html")
    html = template.render(
        challan=challan,
        company=company,
        party=challan.party,
        items=items_data, # Pass calculated data
        total_qty=total_qty,
        qr_code=qr_code_b64
    )
    
    # Generate PDF
    pdf_content = await generate_pdf(html)
    
    # Return PDF
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=DC-{challan.challan_number}.pdf"}
    )
