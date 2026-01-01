from fastapi import Depends, HTTPException, status
from app.models.user import User, UserRole
from app.core.dependencies import get_current_user


def require_super_admin(
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin access required",
        )
    return current_user


def require_company_admin(
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Company Admin access required",
        )
    return current_user
