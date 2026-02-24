"""
API router for role and permission management
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.role import Role
from app.models.permission import Permission
from app.models.role_permission import RolePermission
from app.services.permission_service import PermissionService

router = APIRouter(prefix="/roles", tags=["Roles & Permissions"])


# Pydantic schemas
class PermissionResponse(BaseModel):
    id: int
    module: str
    action: str
    code: str
    description: str | None
    
    class Config:
        from_attributes = True


class RoleResponse(BaseModel):
    id: int
    name: str
    description: str | None
    is_system_role: bool
    is_active: bool
    
    class Config:
        from_attributes = True


class RoleWithPermissions(RoleResponse):
    permissions: List[PermissionResponse]


class RoleCreate(BaseModel):
    name: str
    description: str | None = None
    permission_ids: List[int] = []


class RoleUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None
    permission_ids: List[int] | None = None


# Endpoints
@router.get("/", response_model=List[RoleResponse])
def get_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all roles"""
    # TODO: Add permission check - require_permission("roles.view")
    
    # If Super Admin, return all roles
    if current_user.legacy_role == "SUPER_ADMIN":
        roles = db.query(Role).filter(Role.is_active == True).all()
        return roles

    # For Company Admin / others:
    # 1. Own company roles
    # 2. System roles "Employee" (so they can verify/assign it if needed)
    # 3. EXCLUDE "Super Admin" and "Company Admin" system roles
    roles = db.query(Role).filter(
        Role.is_active == True,
        (Role.company_id == current_user.company_id) | 
        (
            (Role.is_system_role == True) & 
            (Role.name.notin_(["Super Admin", "Company Admin"]))
        )
    ).all()
    return roles


@router.get("/{role_id}", response_model=RoleWithPermissions)
def get_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get role with permissions"""
    # TODO: Add permission check - require_permission("roles.view")
    
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    # Get permissions for this role
    permissions = PermissionService.get_role_permissions(role_id, db)
    
    return {
        **role.__dict__,
        "permissions": permissions
    }


@router.post("/", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
def create_role(
    role_data: RoleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.services.audit_service import log_audit_action
    """Create a new role"""
    # TODO: Add permission check - require_permission("roles.create")
    
    # Check if role name already exists
    existing = db.query(Role).filter(Role.name == role_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Role name already exists")
    
    # Create role
    new_role = Role(
        company_id=current_user.company_id,  # Company-specific role
        name=role_data.name,
        description=role_data.description,
        is_system_role=False,
        is_active=True
    )
    db.add(new_role)
    db.flush()
    
    # Assign permissions
    for perm_id in role_data.permission_ids:
        role_perm = RolePermission(role_id=new_role.id, permission_id=perm_id)
        db.add(role_perm)
    
    db.commit()
    db.refresh(new_role)
    
    # [AUDIT]
    log_audit_action(
        db=db,
        user_id=current_user.id,
        action="ROLE_CREATE",
        company_id=current_user.company_id,
        details=f"Created Role {new_role.name}"
    )
    
    return new_role


@router.put("/{role_id}", response_model=RoleResponse)
def update_role(
    role_id: int,
    role_data: RoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.services.audit_service import log_audit_action
    """Update a role"""
    # TODO: Add permission check - require_permission("roles.edit")
    
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    # Prevent editing Super Admin role
    if role.name == "Super Admin":
        raise HTTPException(status_code=400, detail="Cannot edit Super Admin role")
    
    # Update fields
    if role_data.name:
        role.name = role_data.name
    if role_data.description is not None:
        role.description = role_data.description
    if role_data.is_active is not None:
        role.is_active = role_data.is_active
    
    # Update permissions if provided
    if role_data.permission_ids is not None:
        # Remove existing permissions
        db.query(RolePermission).filter(RolePermission.role_id == role_id).delete()
        
        # Add new permissions
        for perm_id in role_data.permission_ids:
            role_perm = RolePermission(role_id=role_id, permission_id=perm_id)
            db.add(role_perm)
    
    db.commit()
    db.refresh(role)
    
    # [AUDIT]
    log_audit_action(
        db=db,
        user_id=current_user.id,
        action="ROLE_UPDATE",
        company_id=current_user.company_id,
        details=f"Updated Role {role.name}"
    )
    
    return role


@router.delete("/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.services.audit_service import log_audit_action
    """Delete a role"""
    # TODO: Add permission check - require_permission("roles.delete")
    
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    # Prevent deleting system roles
    if role.is_system_role:
        raise HTTPException(status_code=400, detail="Cannot delete system roles")
    
    # Check if any users have this role
    users_count = db.query(User).filter(User.role_id == role_id).count()
    if users_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete role: {users_count} users are assigned to this role"
        )
    
    role_name = role.name
    db.delete(role)
    db.commit()
    
    # [AUDIT]
    log_audit_action(
        db=db,
        user_id=current_user.id,
        action="ROLE_DELETE",
        company_id=current_user.company_id,
        details=f"Deleted Role {role_name}"
    )
    
    return None


# Permission endpoints
@router.get("/permissions/all", response_model=List[PermissionResponse])
def get_all_permissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all available permissions"""
    # TODO: Add permission check - require_permission("roles.view")
    
    permissions = db.query(Permission).order_by(Permission.module, Permission.action).all()
    return permissions


@router.get("/permissions/my", response_model=List[PermissionResponse])
def get_my_permissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's permissions"""
    # Super Admin has all permissions
    if current_user.legacy_role == "SUPER_ADMIN":
        return db.query(Permission).all()

    if not current_user.role_id:
        return []
    
    permissions = PermissionService.get_role_permissions(current_user.role_id, db)
    return permissions
