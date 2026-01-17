from fastapi import Depends, HTTPException, status
from app.models.user import User, UserRole
from app.core.dependencies import get_current_user


def require_super_admin(
    current_user: User = Depends(get_current_user),
):
    # Fix: Compare string (legacy_role) with string (UserRole.value)
    if current_user.legacy_role != UserRole.SUPER_ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin access required",
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
