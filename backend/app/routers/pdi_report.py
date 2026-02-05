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

router = APIRouter()

template_env = Environment(loader=FileSystemLoader("app/templates"))

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

from app.services.pdf_service import pdf_manager

@router.get("/{report_id}/pdf")
async def generate_pdi_report_pdf(report_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    report = db.query(PDIReport).filter(PDIReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="PDI Report not found")
        
    challan = db.query(DeliveryChallan).filter(DeliveryChallan.id == report.challan_id).first()
    
    template = template_env.get_template("pdi_report.html")
    html_content = template.render(
        report=report,
        challan=challan,
        company=challan.company,
        party=challan.party,
        items=challan.items
    )
    
    try:
        pdf_data = await pdf_manager.generate(html_content)
    except Exception as e:
         print(f"Error generating PDF: {e}")
         raise HTTPException(status_code=500, detail="Error generating PDF")
         
    
    headers = {
        'Content-Disposition': f'attachment; filename="PDI_Report_{challan.challan_number}.pdf"'
    }
    return StreamingResponse(io.BytesIO(pdf_data), headers=headers, media_type='application/pdf')
