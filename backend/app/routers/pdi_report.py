from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from fastapi.responses import HTMLResponse, StreamingResponse
from jinja2 import Environment, FileSystemLoader
import io
import os


from app.database.session import get_db
from app.models.pdi_report import PDIReport
from app.models.delivery_challan import DeliveryChallan
from app.schemas.pdi_report import PDIReportCreate, PDIReportUpdate, PDIReportResponse
from app.core.dependencies import get_current_user
from app.models.user import User
from app.services.pdf_service import pdf_manager

router = APIRouter()

templates_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
template_env = Environment(loader=FileSystemLoader(templates_dir))

@router.post("/", response_model=PDIReportResponse)
def create_pdi_report(report: PDIReportCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Check if challan exists
    challan = db.query(DeliveryChallan).filter(DeliveryChallan.id == report.challan_id).first()
    if not challan:
        raise HTTPException(status_code=404, detail="Delivery Challan not found")

    # Check if PDI report already exists for this challan
    existing_report = db.query(PDIReport).filter(PDIReport.challan_id == report.challan_id).first()
    if existing_report:
        raise HTTPException(status_code=400, detail="PDI Report already exists for this challan")

    db_report = PDIReport(**report.dict())
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report

@router.get("/challan/{challan_id}", response_model=PDIReportResponse)
def get_pdi_report_by_challan(challan_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    report = db.query(PDIReport).filter(PDIReport.challan_id == challan_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="PDI Report not found")
    return report

@router.put("/{report_id}", response_model=PDIReportResponse)
def update_pdi_report(report_id: int, report_update: PDIReportUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_report = db.query(PDIReport).filter(PDIReport.id == report_id).first()
    if not db_report:
        raise HTTPException(status_code=404, detail="PDI Report not found")
    
    update_data = report_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_report, key, value)
    
    db.commit()
    db.refresh(db_report)
    return db_report

@router.get("/{report_id}/html", response_class=HTMLResponse)
def view_pdi_report_html(report_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        report = db.query(PDIReport).filter(PDIReport.id == report_id).first()
        if not report:
            return HTMLResponse(content=f"<html><body><h1>Report Not Found ({report_id})</h1></body></html>", status_code=404)
            
        challan = db.query(DeliveryChallan).filter(DeliveryChallan.id == report.challan_id).first()
        
        # Fetch item PDI configuration from the first challan item
        from app.models.delivery_challan_item import DeliveryChallanItem
        from app.models.party_challan_item import PartyChallanItem
        from sqlalchemy.orm import joinedload
        
        challan_item = db.query(DeliveryChallanItem).filter(
            DeliveryChallanItem.challan_id == challan.id
        ).options(
            joinedload(DeliveryChallanItem.party_challan_item).joinedload(PartyChallanItem.item)
        ).first()
        
        item = None
        pdi_parameters = []
        pdi_dimensions = []
        pdi_equipment = []
        
        if challan_item and challan_item.party_challan_item and challan_item.party_challan_item.item:
            item = challan_item.party_challan_item.item
            pdi_parameters = item.pdi_parameters if item.pdi_parameters else []
            pdi_dimensions = item.pdi_dimensions if item.pdi_dimensions else []
            pdi_equipment = item.pdi_equipment if item.pdi_equipment else []
        
        # Verify template exists before rendering
        if not os.path.exists(os.path.join(templates_dir, "pdi_report.html")):
             print(f"[PDI ERROR] Template not found at {os.path.join(templates_dir, 'pdi_report.html')}")
             return HTMLResponse(content=f"<html><body><h1>Template Not Found</h1><p>{os.path.join(templates_dir, 'pdi_report.html')}</p></body></html>", status_code=500)
             
        template = template_env.get_template("pdi_report.html")
        html_content = template.render(
            report=report,
            challan=challan,
            company=challan.company,
            party=challan.party,
            items=challan.items,
            item=item,
            pdi_parameters=pdi_parameters,
            pdi_dimensions=pdi_dimensions,
            pdi_equipment=pdi_equipment
        )
        
        return HTMLResponse(content=html_content)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return HTMLResponse(content=f"<html><body><h1>Error Rendering Report</h1><pre>{str(e)}</pre></body></html>", status_code=500)



@router.get("/{report_id}/pdf")
async def generate_pdi_report_pdf(report_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    report = db.query(PDIReport).filter(PDIReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="PDI Report not found")
        
    challan = db.query(DeliveryChallan).filter(DeliveryChallan.id == report.challan_id).first()
    
    # Fetch item PDI configuration from the first challan item
    from app.models.delivery_challan_item import DeliveryChallanItem
    from app.models.party_challan_item import PartyChallanItem
    from sqlalchemy.orm import joinedload
    
    challan_item = db.query(DeliveryChallanItem).filter(
        DeliveryChallanItem.challan_id == challan.id
    ).options(
        joinedload(DeliveryChallanItem.party_challan_item).joinedload(PartyChallanItem.item)
    ).first()
    
    item = None
    pdi_parameters = []
    pdi_dimensions = []
    pdi_equipment = []
    
    if challan_item and challan_item.party_challan_item and challan_item.party_challan_item.item:
        item = challan_item.party_challan_item.item
        pdi_parameters = item.pdi_parameters if item.pdi_parameters else []
        pdi_dimensions = item.pdi_dimensions if item.pdi_dimensions else []
        pdi_equipment = item.pdi_equipment if item.pdi_equipment else []
    
    print(f"[PDI DEBUG] Rendering template for report {report_id}...")
    template = template_env.get_template("pdi_report.html")
    try:
        html_content = template.render(
            report=report,
            challan=challan,
            company=challan.company,
            party=challan.party,
            items=challan.items,
            item=item,
            pdi_parameters=pdi_parameters,
            pdi_dimensions=pdi_dimensions,
            pdi_equipment=pdi_equipment
        )
        print("[PDI DEBUG] Template rendered successfully.")
    except Exception as e:
        print(f"[PDI ERROR] Template rendering failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Template Error: {e}")
    
    try:
        print("[PDI DEBUG] Calling PDF Manager...")
        pdf_data = await pdf_manager.generate(html_content, options={"landscape": True})
        print(f"[PDI DEBUG] PDF Generated. Size: {len(pdf_data)} bytes.")
    except Exception as e:
         print(f"[PDI ERROR] PDF Generation failed: {e}")
         import traceback
         traceback.print_exc()
         raise HTTPException(status_code=500, detail="Error generating PDF")
         
    
    headers = {
        'Content-Disposition': f'inline; filename="PDI_Report_{challan.challan_number}.pdf"'
    }
    return StreamingResponse(io.BytesIO(pdf_data), headers=headers, media_type='application/pdf')

@router.get("/test-pdf")
async def test_pdf_generation():
    print("[PDI DEBUG] Test PDF requested.")
    html = "<html><body><h1>Test PDF</h1><p>If you see this, PDF service is working.</p></body></html>"
    try:
        pdf_data = await pdf_manager.generate(html)
        print(f"[PDI DEBUG] Test PDF generated. Size: {len(pdf_data)}")
        return StreamingResponse(io.BytesIO(pdf_data), media_type='application/pdf', headers={'Content-Disposition': 'inline; filename="test.pdf"'})
    except Exception as e:
        print(f"[PDI ERROR] Test PDF failed: {e}")
        return {"error": str(e)}

# Force backend reload for checklist removal
