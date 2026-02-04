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
    # We pass qr_code=None to avoid recursive QR generation (or we could include it)
    # The printed version already has the QR. When downloading the "original", it should probably also have it.
    
    import qrcode
    import io
    import base64
    
    qr_data = f"Challan: {challan.challan_number}\nDate: {challan.challan_date}\nParty: {challan.party.name if challan.party else 'N/A'}\nItems: {len(challan.items)}"
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(qr_data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    qr_code_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

    try:
        template = env.get_template("delivery_challan.html")
        html = template.render(
            challan=challan,
            company=company,
            party=challan.party,
            items=items_data,
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
    except Exception as e:
        print(f"CRITICAL ERROR GENERATING CHALLAN PDF: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Error generating PDF: {str(e)}")
