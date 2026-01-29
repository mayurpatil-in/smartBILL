import shutil
import os
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form
from fastapi.responses import FileResponse
from app.services.backup_service import backup_manager, BACKUP_DIR
from app.database.session import engine
from app.models.user import User, UserRole
from app.core.dependencies import require_role
from app.models.audit_log import AuditLog
from sqlalchemy.orm import Session
from app.database.session import get_db

router = APIRouter(
    prefix="/backup",
    tags=["backup"],
    responses={404: {"description": "Not found"}},
)

DB_FILE_PATH = "sql_app.db" # This variable is no longer used for live copy, but kept if needed for legacy compatibility check.

@router.get("/config")
async def get_backup_config():
    """Return current backup configuration including DB type."""
    return {
        "db_type": backup_manager._get_db_type()
    }


@router.get("/list")
async def list_backups(
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN))
):
    """List all available backups on the server."""
    return backup_manager.list_backups()

@router.post("/create")
async def create_backup(
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)),
    password: Optional[str] = Form(None),
    format: str = Form("sql"), # sql or dump
    db: Session = Depends(get_db)
):
    try:
        filename = backup_manager.create_backup(auto=False, password=password, format=format)
        if not filename:
             raise HTTPException(status_code=500, detail="Backup creation failed")

        # [AUDIT]
        db.add(AuditLog(
            user_id=current_user.id,
            action="BACKUP_CREATE",
            details=f"Created backup {filename}",
            company_id=current_user.company_id
        ))
        db.commit()

        return {"message": "Backup created successfully", "filename": filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{filename}")
async def delete_backup(
    filename: str,
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)),
    db: Session = Depends(get_db)
):
    success = backup_manager.delete_backup(filename)
    if not success:
        raise HTTPException(status_code=404, detail="Backup not found")

    # [AUDIT]
    db.add(AuditLog(
        user_id=current_user.id,
        action="BACKUP_DELETE",
        details=f"Deleted backup {filename}",
        company_id=current_user.company_id
    ))
    db.commit()

    return {"message": "Backup deleted"}

@router.get("/download/{filename}")
async def download_backup(
    filename: str,
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)),
    db: Session = Depends(get_db)
):
    """Download a specific backup file from the server history."""
    file_path = os.path.join(BACKUP_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    media_type = "application/x-sql"
    if filename.endswith(".enc") or filename.endswith(".dump"):
        media_type = "application/octet-stream"

    # [AUDIT]
    db.add(AuditLog(
        user_id=current_user.id,
        action="BACKUP_DOWNLOAD",
        details=f"Downloaded backup {filename}",
        company_id=current_user.company_id
    ))
    db.commit()

    return FileResponse(
        path=file_path,
        filename=filename,
        media_type=media_type
    )




@router.post("/import")
async def import_backup(
    file: UploadFile = File(...),
    password: Optional[str] = Form(None),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN))
):
    """
    Import a database backup (.sql or .enc).
    WARNING: This replaces the data in the database.
    """
    if not (file.filename.endswith(".sql") or file.filename.endswith(".enc") or file.filename.endswith(".db")):
          # Allow .db for legacy/compat, but mainly expect .sql
         pass

    # 1. Create a safety backup
    backup_manager.create_backup(auto=True)
    
    # Save uploaded file to temp path
    temp_filename = f"temp_upload_{file.filename}"
    try:
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        source_path = temp_filename

        # 2. Decrypt if encrypted
        if file.filename.endswith(".enc"):
            if not password:
                 os.remove(temp_filename)
                 raise HTTPException(status_code=400, detail="Password required for encrypted backup")
            try:
                decrypted_path = backup_manager.decrypt_backup_file(temp_filename, password)
                # Cleanup encrypted temp
                os.remove(temp_filename)
                source_path = decrypted_path
            except Exception as e:
                if os.path.exists(temp_filename): os.remove(temp_filename)
                raise HTTPException(status_code=400, detail=f"Decryption failed: {str(e)}")

        # 3. Restore using psql
        try:
            backup_manager.restore_database(source_path)
        except Exception as e:
            raise Exception(f"PSQL Restore failed: {str(e)}")
            
        # Cleanup decrypted source if it was temp
        if source_path != temp_filename and os.path.exists(source_path):
            os.remove(source_path)
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
        
    except HTTPException as he:
        raise he
    except Exception as e:
        if os.path.exists(temp_filename): os.remove(temp_filename)
        raise HTTPException(status_code=500, detail=f"Failed to restore backup: {str(e)}")
        
    return {"message": "Database restored successfully. Safety backup created."}
