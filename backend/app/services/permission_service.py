"""
Permission checking service for RBAC system
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.role import Role
from app.models.permission import Permission
from app.models.role_permission import RolePermission


class PermissionService:
    """Service for checking user permissions"""
    
    @staticmethod
    def get_user_permissions(user: User, db: Session) -> List[str]:
        """Get all permission codes for a user"""
        # Super Admin has all permissions
        if user.legacy_role == "SUPER_ADMIN":
            return ["*"]

        if not user.role_id:
            return []
        
        # Query permissions for user's role
        permissions = (
            db.query(Permission.code)
            .join(RolePermission, Permission.id == RolePermission.permission_id)
            .filter(RolePermission.role_id == user.role_id)
            .all()
        )
        
        return [p.code for p in permissions]
    
    @staticmethod
    def has_permission(user: User, permission_code: str, db: Session) -> bool:
        """Check if user has a specific permission"""
        # Super Admin has all permissions
        if user.legacy_role == "SUPER_ADMIN":
            return True

        if not user or not user.role_id:
            return False
        
        # Check if user's role has this permission
        exists = (
            db.query(Permission.id)
            .join(RolePermission, Permission.id == RolePermission.permission_id)
            .filter(
                RolePermission.role_id == user.role_id,
                Permission.code == permission_code
            )
            .first()
        )
        
        return exists is not None
    
    @staticmethod
    def has_any_permission(user: User, permission_codes: List[str], db: Session) -> bool:
        """Check if user has any of the specified permissions"""
        if not user or not user.role_id:
            return False
        
        for code in permission_codes:
            if PermissionService.has_permission(user, code, db):
                return True
        return False
    
    @staticmethod
    def has_all_permissions(user: User, permission_codes: List[str], db: Session) -> bool:
        """Check if user has all of the specified permissions"""
        if not user or not user.role_id:
            return False
        
        for code in permission_codes:
            if not PermissionService.has_permission(user, code, db):
                return False
        return True
    
    @staticmethod
    def get_role_permissions(role_id: int, db: Session) -> List[Permission]:
        """Get all permissions for a role"""
        permissions = (
            db.query(Permission)
            .join(RolePermission, Permission.id == RolePermission.permission_id)
            .filter(RolePermission.role_id == role_id)
            .all()
        )
        return permissions
