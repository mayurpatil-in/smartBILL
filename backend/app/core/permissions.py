"""
Permission decorators for protecting API endpoints
"""
from functools import wraps
from typing import List
from fastapi import HTTPException, status, Depends
from sqlalchemy.orm import Session
from app.models.user import User
from app.services.permission_service import PermissionService
from app.database.session import get_db


def require_permission(permission_code: str):
    """
    Decorator to require a specific permission for an endpoint
    
    Usage:
        @router.get("/invoices")
        @require_permission("invoices.view")
        def get_invoices(current_user: User = Depends(get_current_user)):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract current_user and db from kwargs
            current_user = kwargs.get('current_user')
            db = kwargs.get('db')
            
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Not authenticated"
                )
            
            if not db:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Database session not available"
                )
            
            # Check permission
            if not PermissionService.has_permission(current_user, permission_code, db):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission denied: {permission_code} required"
                )
            
            return await func(*args, **kwargs) if asyncio.iscoroutinefunction(func) else func(*args, **kwargs)
        
        return wrapper
    return decorator


def require_any_permission(*permission_codes: str):
    """
    Decorator to require any of the specified permissions
    
    Usage:
        @router.get("/reports")
        @require_any_permission("reports.view", "reports.export")
        def get_reports(current_user: User = Depends(get_current_user)):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get('current_user')
            db = kwargs.get('db')
            
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Not authenticated"
                )
            
            if not db:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Database session not available"
                )
            
            # Check if user has any of the permissions
            if not PermissionService.has_any_permission(current_user, list(permission_codes), db):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission denied: One of {permission_codes} required"
                )
            
            return await func(*args, **kwargs) if asyncio.iscoroutinefunction(func) else func(*args, **kwargs)
        
        return wrapper
    return decorator


def check_permission(user: User, permission_code: str, db: Session) -> bool:
    """
    Helper function to check permission in route logic
    
    Usage:
        if check_permission(current_user, "invoices.delete", db):
            # Allow deletion
        else:
            raise HTTPException(403, "Cannot delete")
    """
    return PermissionService.has_permission(user, permission_code, db)


import asyncio
