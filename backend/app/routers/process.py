from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.process import Process
from app.schemas.process import ProcessCreate, ProcessResponse
from app.core.dependencies import get_company_id

router = APIRouter(prefix="/process", tags=["Process"])


@router.post("/", response_model=ProcessResponse)
def create_process(
    data: ProcessCreate,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    process = Process(company_id=company_id, **data.dict())

    db.add(process)
    db.commit()
    db.refresh(process)

    return process


@router.get("/", response_model=list[ProcessResponse])
def list_processes(
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    return db.query(Process).filter(
        Process.company_id == company_id
    ).all()


@router.put("/{process_id}", response_model=ProcessResponse)
def update_process(
    process_id: int,
    data: ProcessCreate,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    process = db.query(Process).filter(
        Process.id == process_id,
        Process.company_id == company_id
    ).first()

    if not process:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Process not found"
        )

    for key, value in data.dict().items():
        setattr(process, key, value)

    db.commit()
    db.refresh(process)
    return process


@router.delete("/{process_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_process(
    process_id: int,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    process = db.query(Process).filter(
        Process.id == process_id,
        Process.company_id == company_id
    ).first()

    if not process:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Process not found"
        )

    db.delete(process)
    db.commit()
