from fastapi import Depends, HTTPException, status, Request
from app.models.user import User, UserRole
from app.core.dependencies import get_current_user
from app.core.config import settings


def require_super_admin(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    # Fix: Compare string (legacy_role) with string (UserRole.value)
    if current_user.legacy_role != UserRole.SUPER_ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin access required",
        )
        
    # 🌍 SUPER ADMIN IP CHECK
    if settings.SUPER_ADMIN_ALLOWED_IPS:
        allowed_ips = [ip.strip() for ip in settings.SUPER_ADMIN_ALLOWED_IPS.split(",") if ip.strip()]
        client_ip = request.client.host
        if allowed_ips and client_ip not in allowed_ips:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Super Admin access denied from this IP address.",
            )
            
    return current_user


def require_company_admin(
    current_user: User = Depends(get_current_user),
):
    # Fix: Compare string (legacy_role) with list of strings
    allowed_roles = [UserRole.SUPER_ADMIN.value, UserRole.COMPANY_ADMIN.value]
    if current_user.legacy_role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Company Admin access required",
        )
    return current_user
