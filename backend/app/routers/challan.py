from fastapi import APIRouter, Depends, HTTPException, Request, Query, Response
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, case, or_
from typing import List, Optional, Any
from decimal import Decimal
import math

from app.database.session import get_db
from app.models.delivery_challan import DeliveryChallan
from app.models.delivery_challan_item import DeliveryChallanItem
from app.models.party_challan import PartyChallan
from app.models.party_challan_item import PartyChallanItem
from app.models.stock_transaction import StockTransaction
from app.schemas.challan import ChallanCreate, ChallanResponse, ChallanUpdate
from app.core.dependencies import get_company_id, get_active_financial_year, require_feature, get_current_user
from app.core.permissions import require_permission
from app.models.user import User
from app.models.party import Party
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
@require_permission("challans.create")
def create_challan(
    data: ChallanCreate,
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Server-side Validations
    if not data.items or len(data.items) == 0:
        raise HTTPException(status_code=400, detail="Delivery challan must contain at least one item")

    party = db.query(Party).filter(Party.id == data.party_id, Party.company_id == company_id).first()
    if not party:
        raise HTTPException(status_code=404, detail="Selected Party not found")

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
        pc_item = db.get(PartyChallanItem, item_data.party_challan_item_id)
        if not pc_item:
            raise HTTPException(
                status_code=404,
                detail=f"Party challan item {item_data.party_challan_item_id} not found"
            )

        total_line_qty = float(item_data.quantity) if item_data.quantity and float(item_data.quantity) > 0 else (float(item_data.ok_qty) + float(item_data.cr_qty) + float(item_data.mr_qty))
        if total_line_qty <= 0:
            raise HTTPException(
                status_code=400,
                detail=f"Total quantity for item {pc_item.item_id} must be greater than 0"
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
            rate=item_data.rate,
            party_rate=item_data.party_rate
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

    # [LOW STOCK ALERT] Check each delivered item after commit
    # Non-fatal: must NOT block challan creation response
    try:
        from app.models.item import Item as ItemModel
        from app.services.notification_service import create_notification
        item_ids_to_check = set()
        for item_data in data.items:
            pc_item_check = db.get(PartyChallanItem, item_data.party_challan_item_id)
            if pc_item_check:
                item_ids_to_check.add(pc_item_check.item_id)
        
        if item_ids_to_check:
            low_stock_items = db.query(ItemModel).filter(
                ItemModel.id.in_(item_ids_to_check),
                ItemModel.company_id == company_id
            ).all()
            for item_obj in low_stock_items:
                if item_obj and float(item_obj.current_stock) <= 5:
                    create_notification(
                        db=db,
                        company_id=company_id,
                        title=f"Low Stock: {item_obj.name}",
                        message=f"Only {float(item_obj.current_stock):.0f} unit(s) remaining after delivery. Consider restocking.",
                        type="warning",
                    )
    except Exception as notify_err:
        print(f"[Challan] Low stock notification failed (non-fatal): {notify_err}")

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
        "items": []
    }


@router.put("/{challan_id}", response_model=ChallanResponse)
@require_permission("challans.edit")
def update_challan(
    challan_id: int,
    data: ChallanCreate,
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Get existing challan with full relationship tree
    challan = db.query(DeliveryChallan).options(
        joinedload(DeliveryChallan.items)
        .joinedload(DeliveryChallanItem.party_challan_item)
        .joinedload(PartyChallanItem.party_challan)
        .joinedload(PartyChallan.items)
    ).filter(
        DeliveryChallan.id == challan_id,
        DeliveryChallan.company_id == company_id
    ).first()
    
    if not challan:
        raise HTTPException(status_code=404, detail="Delivery challan not found")
    
    # Step 1: Reverse all old items' delivered quantities & party challan statuses
    for old_item in list(challan.items):
        pc_item = old_item.party_challan_item
        if pc_item:
            # Safely reduce delivered quantity
            new_delivered = pc_item.quantity_delivered - Decimal(str(old_item.quantity))
            pc_item.quantity_delivered = max(Decimal("0"), new_delivered)
            
            # Recalculate party challan status
            party_challan = pc_item.party_challan
            if party_challan:
                total_ordered = sum(float(item.quantity_ordered) for item in party_challan.items)
                total_delivered = sum(float(item.quantity_delivered) for item in party_challan.items)
                
                if total_delivered <= 0:
                    party_challan.status = "open"
                elif total_delivered >= total_ordered:
                    party_challan.status = "completed"
                else:
                    party_challan.status = "partial"

    # Step 2: Delete old stock transactions & old items
    db.query(StockTransaction).filter(
        StockTransaction.reference_type == "DELIVERY_CHALLAN",
        StockTransaction.reference_id == challan.id
    ).delete(synchronize_session=False)

    for old_item in list(challan.items):
        db.delete(old_item)
        
    db.flush()
    
    # Step 3: Update challan metadata
    challan.party_id = data.party_id
    challan.challan_date = data.challan_date
    challan.vehicle_number = data.vehicle_number
    challan.notes = data.notes
    challan.status = data.status or "sent"
    
    # Step 4: Add new items
    for item_data in data.items:
        pc_item = db.query(PartyChallanItem).options(
            joinedload(PartyChallanItem.party_challan).joinedload(PartyChallan.items)
        ).filter(PartyChallanItem.id == item_data.party_challan_item_id).first()

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
            rate=item_data.rate,
            party_rate=item_data.party_rate
        )
        db.add(challan_item)
        
        # Update party challan item delivered quantity
        pc_item.quantity_delivered += Decimal(str(item_data.quantity))
        
        # Update party challan status
        party_challan = pc_item.party_challan
        if party_challan:
            total_ordered = sum(float(item.quantity_ordered) for item in party_challan.items)
            total_delivered = sum(float(item.quantity_delivered) for item in party_challan.items)
            
            if total_delivered <= 0:
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
        "client_status": challan.client_status or "pending",
        "client_notes": challan.client_notes,
        "is_active": challan.is_active,
        "items": []
    }


@router.post("/{challan_id}/resolve-issue")
@require_permission("challans.edit")
def resolve_delivery_issue(
    challan_id: int,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    challan = db.query(DeliveryChallan).filter(
        DeliveryChallan.id == challan_id,
        DeliveryChallan.company_id == company_id
    ).first()

    if not challan:
        raise HTTPException(status_code=404, detail="Delivery challan not found")

    challan.client_status = "resolved"
    db.commit()
    
    return {"message": "Issue resolved successfully", "client_status": challan.client_status}


@router.get("/")
@require_permission("challans.view")
def list_challans(
    response: Response,
    party_id: Optional[int] = None,
    item_id: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    page: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100000),
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(DeliveryChallan).filter(
        DeliveryChallan.company_id == company_id,
        DeliveryChallan.financial_year_id == fy.id
    )
    
    if party_id:
        query = query.filter(DeliveryChallan.party_id == party_id)
    
    if status:
        query = query.filter(DeliveryChallan.status == status)

    if start_date:
        query = query.filter(DeliveryChallan.challan_date >= start_date)
    
    if end_date:
        query = query.filter(DeliveryChallan.challan_date <= end_date)

    if search and search.strip():
        search_pattern = f"%{search.strip()}%"
        query = query.join(DeliveryChallan.party, isouter=True).filter(
            or_(
                DeliveryChallan.challan_number.ilike(search_pattern),
                DeliveryChallan.vehicle_number.ilike(search_pattern),
                Party.name.ilike(search_pattern)
            )
        )

    if item_id:
        query = query.join(DeliveryChallan.items).join(DeliveryChallanItem.party_challan_item).filter(
            PartyChallanItem.item_id == item_id
        )
    
    total_records = query.distinct().count()
    response.headers["X-Total-Count"] = str(total_records)
    response.headers["Access-Control-Expose-Headers"] = "X-Total-Count"

    # Apply relationships eager loading for final fetch
    query_with_options = query.options(
        joinedload(DeliveryChallan.party),
        joinedload(DeliveryChallan.pdi_report),
        joinedload(DeliveryChallan.items).joinedload(DeliveryChallanItem.party_challan_item).joinedload(PartyChallanItem.party_challan),
        joinedload(DeliveryChallan.items).joinedload(DeliveryChallanItem.party_challan_item).joinedload(PartyChallanItem.item),
        joinedload(DeliveryChallan.items).joinedload(DeliveryChallanItem.party_challan_item).joinedload(PartyChallanItem.process),
        joinedload(DeliveryChallan.items).joinedload(DeliveryChallanItem.process)
    )

    current_skip = (page - 1) * limit if page and page > 0 else skip
    challans = query_with_options.order_by(DeliveryChallan.id.desc()).offset(current_skip).limit(limit).all()
    
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
            "client_status": challan.client_status or "pending",
            "client_notes": challan.client_notes,
            "is_active": challan.is_active,
            "has_pdi_report": len(challan.pdi_report) > 0 if hasattr(challan, "pdi_report") and challan.pdi_report else False,
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
                    "party_rate": float(item.party_rate) if item.party_rate else 0.0,
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
    
    if page:
        return {
            "items": response_data,
            "total": total_records,
            "page": page,
            "limit": limit,
            "total_pages": math.ceil(total_records / limit) if limit else 1
        }
    return response_data


@router.get("/stats")
@require_permission("challans.view")
def get_challan_stats(
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get statistics for delivery challans using single SQL query aggregation"""
    stats_row = db.query(
        func.count(DeliveryChallan.id).label("total"),
        func.sum(case((DeliveryChallan.status == "sent", 1), else_=0)).label("sent"),
        func.sum(case((DeliveryChallan.status == "delivered", 1), else_=0)).label("delivered"),
        func.sum(case((DeliveryChallan.client_status == "discrepancy", 1), else_=0)).label("pending_discrepancies")
    ).filter(
        DeliveryChallan.company_id == company_id,
        DeliveryChallan.financial_year_id == fy.id
    ).first()
    
    return {
        "total": stats_row.total or 0 if stats_row else 0,
        "sent": int(stats_row.sent or 0) if stats_row else 0,
        "delivered": int(stats_row.delivered or 0) if stats_row else 0,
        "pending_discrepancies": int(stats_row.pending_discrepancies or 0) if stats_row else 0
    }


@router.get("/next-number/preview")
@require_permission("challans.create")
def get_next_challan_number(
    party_id: int,
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get the next challan number that will be generated"""
    next_number = generate_challan_number(db, company_id, fy.id, party_id)
    return {"next_challan_number": next_number}


@router.get("/pending-items/{party_id}")
@require_permission("challans.create")
def get_pending_challan_items(
    party_id: int,
    invoice_id: int = None,
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
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
                 "barcode": item_obj.barcode if item_obj else None,
                 "delivery_challan_item_id": base_item.id, # Primary ID for reference
                 "delivery_challan_item_ids": group["ids"], # List of all IDs for backend logic
                 "ok_qty": rem_ok,
                 "cr_qty": rem_cr,
                 "mr_qty": rem_mr, # Use Remaining MR
                 "quantity": rem_ok + rem_cr + rem_mr, # Total includes Remaining MR
                 "original_ok_qty": group["orig_ok"],
                 "original_cr_qty": group["orig_cr"],
                 "rate": key[2], # The rate from the key
                 "party_rate": float(group["item"].party_rate) if group["item"].party_rate else 0.0
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
            inv = db.get(Invoice, linked_item.invoice_id)
            inv_num = inv.invoice_number if inv else "Unknown"
            
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete challan because items are billed in Invoice {inv_num}"
            )
    
    # Reverse party challan delivered quantities
    for item in challan.items:
        if item.party_challan_item_id:
            pc_item = db.get(PartyChallanItem, item.party_challan_item_id)
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
    
    # Delete PDI report if exists
    from app.models.pdi_report import PDIReport
    db.query(PDIReport).filter(PDIReport.challan_id == challan_id).delete()
    
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
from pydantic import BaseModel
from typing import List, Dict, Any, Set
import os

# Set up Jinja2
templates_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
env = Environment(loader=FileSystemLoader(templates_dir))

class BulkPrintRequest(BaseModel):
    challan_ids: List[int]

def prepare_challan_print_data(challan) -> Dict[str, Any]:
    """Helper to prepare data for a single challan print"""
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
    signature = create_url_signature(str(challan.id))
    download_url = f"{base_url}/public/challan/{challan.id}/download?token={signature}"
    
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
        
        # Initialize
        opening_qty = 0
        balance_qty = 0
        
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
        # Helper function to safely get rate
        def get_effective_rate(original):
            if original.rate and original.rate > 0:
                return float(original.rate)
            if original.party_challan_item:
                if original.party_challan_item.rate and original.party_challan_item.rate > 0:
                    return float(original.party_challan_item.rate)
                if original.party_challan_item.item and original.party_challan_item.item.rate:
                    return float(original.party_challan_item.item.rate)
            return 0.0

        # Helper for Indian Currency Formatting
        def format_indian_currency(value):
            try:
                value = float(value)
                # Format to 2 decimal places first
                s = "{:.2f}".format(value)
                parts = s.split('.')
                integer_part = parts[0]
                decimal_part = parts[1]
                
                # If less than 1000, no special formatting needed
                if len(integer_part) <= 3:
                    return s
                
                # Logic for Indian Numbering System
                # Last 3 digits
                last_three = integer_part[-3:]
                remaining = integer_part[:-3]
                
                # Group remaining digits in pairs of 2 from right to left
                formatted_remaining = ""
                while len(remaining) > 2:
                    formatted_remaining = "," + remaining[-2:] + formatted_remaining
                    remaining = remaining[:-2]
                
                formatted_remaining = remaining + formatted_remaining
                
                return formatted_remaining + "," + last_three + "." + decimal_part
            except:
                return str(value)

        # Calculate Rate and Amount
        eff_rate = get_effective_rate(data["item_obj"])
        eff_p_rate = float(getattr(data["item_obj"], "party_rate", 0) or 0)
        total_rate = eff_rate + eff_p_rate
        
        # Calculate Amount (Total Qty * Total Rate)
        # Note: Total Qty here refers to Dispatch Qty for line item calculation
        line_qty = int(data["ok"]) + int(data["cr"]) + int(data["mr"]) # Should match dispatch
        total_amount = line_qty * total_rate
        
        # Create a dict instead of ProxyItem class to allow easy access in template
        proxy_item_obj = {
            "party_challan_item": data["item_obj"].party_challan_item,
            "process": data["item_obj"].process,
            "ok_qty": int(data["ok"]),
            "cr_qty": int(data["cr"]),
            "mr_qty": int(data["mr"]),
            "party_rate": eff_p_rate,
            "rate": eff_rate,
            "total_rate": total_rate, # Pre-calculated for template
            "amount_formatted": format_indian_currency(total_amount) # Pre-formatted
        }

        items_data.append({
            "item_obj": proxy_item_obj,
            "opening": int(opening_qty),
            "dispatch": int(current_dispatch),
            "balance": int(balance_qty),
            "ref_list": ref_list # Pass list of ref strings
        })
        
    return {
        "challan": challan,
        "party": challan.party,
        "items": items_data,
        "total_qty": total_qty,
        "qr_code": qr_code_b64
    }

@router.post("/bulk-print")
@require_permission("challans.view")
async def bulk_print_challans(
    request: BulkPrintRequest,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate a single PDF containing multiple delivery challans"""
    try:
        if not request.challan_ids:
            raise HTTPException(status_code=400, detail="No challan IDs provided")

        # Fetch all challans
        challans = db.query(DeliveryChallan).options(
            joinedload(DeliveryChallan.party),
            joinedload(DeliveryChallan.items).joinedload(DeliveryChallanItem.party_challan_item).joinedload(PartyChallanItem.item),
            joinedload(DeliveryChallan.items).joinedload(DeliveryChallanItem.party_challan_item).joinedload(PartyChallanItem.party_challan),
            joinedload(DeliveryChallan.items).joinedload(DeliveryChallanItem.process)
        ).filter(
            DeliveryChallan.id.in_(request.challan_ids),
            DeliveryChallan.company_id == company_id
        ).all()
        
        if not challans:
            raise HTTPException(status_code=404, detail="No valid challans found")

        # Sort challans by ID desc (or user preference? Usually Descending or as provided)
        # We will map to input order.
        challan_map = {c.id: c for c in challans}
        ordered_challans = []
        for cid in request.challan_ids:
            if cid in challan_map:
                ordered_challans.append(challan_map[cid])
            
        # Fetch company
        company = db.query(Company).filter(Company.id == company_id).first()
        
        # Prepare data for each challan
        challans_data = []
        for challan in ordered_challans:
            data = prepare_challan_print_data(challan)
            challans_data.append(data)
            
        # Render Template
        template = env.get_template("delivery_challan_bulk.html")
        html = template.render(
            challans_list=challans_data,
            company=company
        )
        
        # Generate PDF
        pdf_content = await generate_pdf(html)
        
        return Response(
            content=pdf_content,
            media_type="text/html",
            headers={"Content-Disposition": "inline; filename=bulk-delivery-challans.pdf"}
        )
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        # Log to file for debugging
        try:
            with open("debug_log.txt", "a") as f:
                f.write(f"\n--- Bulk Print Error ---\n{error_msg}\n------------------------\n")
        except:
            pass
        
        # print to console as well
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Bulk Print Error: {str(e)}")

@router.get("/{challan_id}/print")
@require_permission("challans.view")
async def print_challan(
    challan_id: int,
    request: Request,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
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
    
    # Prepare data
    data = prepare_challan_print_data(challan)

    # Render Template
    template = env.get_template("delivery_challan.html")
    html = template.render(
        challan=data["challan"],
        party=data["party"],
        company=company,
        items=data["items"],
        total_qty=data["total_qty"],
        qr_code=data["qr_code"]
    )
    
    try:
        # Generate PDF
        pdf_content = await generate_pdf(html)
        
        # Return PDF
        return Response(
            content=pdf_content,
            media_type="text/html",
            headers={"Content-Disposition": f"inline; filename=DC-{challan.challan_number}.pdf"}
        )
    except Exception as e:
        import traceback
        print(f"PDF Generation Error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")


@router.get("/{challan_id}/share")
@require_permission("challans.view")
async def share_challan(
    challan_id: int,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _ = Depends(require_feature("WHATSAPP_SHARE"))
):
    """Generate a WhatsApp-ready sharing link and message for a delivery challan"""
    from app.core.config import get_backend_url
    from app.core.security import create_url_signature
    import urllib.parse
    
    challan = db.query(DeliveryChallan).options(
        joinedload(DeliveryChallan.party)
    ).filter(
        DeliveryChallan.id == challan_id,
        DeliveryChallan.company_id == company_id
    ).first()
    
    if not challan:
        raise HTTPException(status_code=404, detail="Delivery Challan not found")

    base_url = get_backend_url()
    signature = create_url_signature(str(challan.id))
    download_url = f"{base_url}/public/challan/{challan.id}/download?token={signature}"
    
    # Generate Short Link (with fallback to long link if DB fails)
    short_download_url = download_url
    try:
        import string
        import random
        from datetime import datetime, timedelta, timezone
        from app.models.short_link import ShortLink
        
        # Generate a unique 10-character code
        chars = string.ascii_letters + string.digits
        while True:
            short_code = ''.join(random.choice(chars) for _ in range(10))
            if not db.query(ShortLink).filter(ShortLink.code == short_code).first():
                break
                
        # Save the short link (expires in 30 days)
        expires_at = datetime.now(timezone.utc) + timedelta(days=30)
        short_link = ShortLink(
            code=short_code,
            target_url=download_url,
            expires_at=expires_at
        )
        db.add(short_link)
        db.commit()
        
        # If successful, use the short URL
        short_download_url = f"{base_url}/public/challan/dl/{short_code}"
    except Exception as e:
        print(f"Failed to generate short link (DB issue?): {e}")
        db.rollback()
        # It will gracefully fallback to the original long download_url
    # Format the message
    company = db.query(Company).filter(Company.id == company_id).first()
    company_name = company.name if company else "Our Company"
    party_name = challan.party.name if challan.party else "Customer"
    
    # Pure ASCII message — works on ALL WhatsApp versions and devices
    challan_date_str = challan.challan_date.strftime('%d %b %Y') if challan.challan_date else "N/A"

    # Calculate totals from challan items
    total_qty = sum(float(item.quantity or 0) for item in challan.items)
    total_amount = sum(float(item.quantity or 0) * float(item.rate or 0) for item in challan.items)

    lines = [
        f"*{company_name}*",
        "_"*32,
        f"Dear {party_name},",
        "",
        "Your delivery challan has been successfully generated.",
        "",
        f"*Challan No:* {challan.challan_number}",
        f"*Date:* {challan_date_str}",
        f"*Vehicle No:* {challan.vehicle_number or 'N/A'}",
        f"*Total Qty:* {total_qty:g}",
        f"*Total Amount:* Rs. {total_amount:,.2f}",
        "",
        "*Download PDF:*",
        short_download_url,
        "",
        "Thank you for your business.",
        "Have a great day!",
        "",
        "Powered by SmartBill",
    ]
    # Use CRLF (\r\n) for newlines as WhatsApp Web strictly requires it for proper line breaks
    message = "\r\n".join(lines)

    # Create the whatsapp deep link (explicit utf-8, safe='' to encode everything)
    encoded_message = urllib.parse.quote(message, safe="", encoding="utf-8")
    whatsapp_url = f"https://wa.me/?text={encoded_message}"
    return {
        "challan_id": challan.id,
        "whatsapp_url": whatsapp_url,
        "message": message,
        "download_url": short_download_url
    }

@router.delete("/{challan_id}")
@require_permission("challans.delete")
def delete_challan(
    challan_id: int,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Get existing challan with full relationship tree
    challan = db.query(DeliveryChallan).options(
        joinedload(DeliveryChallan.items)
        .joinedload(DeliveryChallanItem.party_challan_item)
        .joinedload(PartyChallanItem.party_challan)
        .joinedload(PartyChallan.items)
    ).filter(
        DeliveryChallan.id == challan_id,
        DeliveryChallan.company_id == company_id
    ).first()
    
    if not challan:
        raise HTTPException(status_code=404, detail="Delivery challan not found")

    # Reverse delivered quantities on PartyChallanItems
    for old_item in list(challan.items):
        pc_item = old_item.party_challan_item
        if pc_item:
            new_delivered = pc_item.quantity_delivered - Decimal(str(old_item.quantity))
            pc_item.quantity_delivered = max(Decimal("0"), new_delivered)
            
            party_challan = pc_item.party_challan
            if party_challan:
                total_ordered = sum(float(item.quantity_ordered) for item in party_challan.items)
                total_delivered = sum(float(item.quantity_delivered) for item in party_challan.items)
                
                if total_delivered <= 0:
                    party_challan.status = "open"
                elif total_delivered >= total_ordered:
                    party_challan.status = "completed"
                else:
                    party_challan.status = "partial"

    # Delete stock transactions
    db.query(StockTransaction).filter(
        StockTransaction.reference_type == "DELIVERY_CHALLAN",
        StockTransaction.reference_id == challan.id
    ).delete(synchronize_session=False)

    db.delete(challan)
    db.commit()
    
    return {"message": "Delivery Challan deleted successfully"}
