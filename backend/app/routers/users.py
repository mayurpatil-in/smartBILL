from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database.session import get_db
from app.models.user import User
from app.models.role import Role
from app.core.dependencies import get_current_user
from app.core.security import get_password_hash
from app.services.permission_service import PermissionService
from pydantic import BaseModel, EmailStr

router = APIRouter(
    prefix="/users",
    tags=["Users"],
)


# ========================
# SCHEMAS
# ========================
class UserWithRoleResponse(BaseModel):
    id: int
    name: str
    email: Optional[str]
    is_active: bool
    role_id: Optional[int]
    role_name: Optional[str]
    role_description: Optional[str]
    
    class Config:
        from_attributes = True


class CreateUserRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role_id: int


class AssignRoleRequest(BaseModel):
    role_id: int


class UpdateUserRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None


# ========================
# ENDPOINTS
# ========================

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_user(
    request: CreateUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new user in the current user's company.
    Requires: users.create permission
    """
    # Check permission
    if not PermissionService.has_permission(current_user, "users.create", db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: users.create required"
        )
    
    # Super admins can't create company users this way
    if not current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Super admins cannot create company users"
        )
    
    # Check if email already exists
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Verify role exists and is not Super Admin
    role = db.query(Role).filter(Role.id == request.role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    if role.name == "Super Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot assign Super Admin role"
        )
    
    # Determine legacy_role based on role name
    legacy_role_map = {
        "Company Admin": "COMPANY_ADMIN",
        "Accountant": "USER",
        "Sales Manager": "USER",
        "Warehouse Manager": "USER",
        "HR Manager": "USER",
        "Employee": "USER",
    }
    legacy_role = legacy_role_map.get(role.name, "USER")
    
    # Create user
    new_user = User(
        name=request.name,
        email=request.email,
        password_hash=get_password_hash(request.password),
        role_id=request.role_id,
        legacy_role=legacy_role,
        company_id=current_user.company_id,  # Same company as creator
        is_active=True,
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {
        "message": "User created successfully",
        "user_id": new_user.id,
        "email": new_user.email,
        "role_name": role.name
    }


@router.get("/", response_model=List[UserWithRoleResponse])
def get_company_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all users in the current user's company.
    Requires: users.view permission
    """
    # Check permission
    if not PermissionService.has_permission(current_user, "users.view", db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: users.view required"
        )
    
    # Super admins don't belong to a company
    if not current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Super admins cannot view company users"
        )
    
    # Get all users in the same company
    users = db.query(User).filter(
        User.company_id == current_user.company_id
    ).all()
    
    # Format response with role information
    result = []
    for user in users:
        result.append(UserWithRoleResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            is_active=user.is_active,
            role_id=user.role_id,
            role_name=user.role.name if user.role else None,
            role_description=user.role.description if user.role else None,
        ))
    
    return result


@router.get("/{user_id}", response_model=UserWithRoleResponse)
def get_user_details(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get details of a specific user.
    Requires: users.view permission
    """
    # Check permission
    if not PermissionService.has_permission(current_user, "users.view", db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: users.view required"
        )
    
    # Get the user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Ensure the user belongs to the same company
    if user.company_id != current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access users from other companies"
        )
    
    return UserWithRoleResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        is_active=user.is_active,
        role_id=user.role_id,
        role_name=user.role.name if user.role else None,
        role_description=user.role.description if user.role else None,
    )


@router.put("/{user_id}")
def update_user(
    user_id: int,
    request: UpdateUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update user details (name, email, password, is_active).
    Requires: users.edit permission
    """
    # Check permission
    if not PermissionService.has_permission(current_user, "users.edit", db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: users.edit required"
        )
    
    # Get the user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Ensure the user belongs to the same company
    if user.company_id != current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot modify users from other companies"
        )
    
    # Update fields
    if request.name is not None:
        user.name = request.name
    
    if request.email is not None:
        # Check if email is already taken by another user
        existing = db.query(User).filter(
            User.email == request.email,
            User.id != user_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use by another user"
            )
        user.email = request.email
    
    if request.password is not None:
        user.password_hash = get_password_hash(request.password)
    
    if request.is_active is not None:
        user.is_active = request.is_active
    
    db.commit()
    db.refresh(user)
    
    return {
        "message": "User updated successfully",
        "user_id": user.id,
        "name": user.name,
        "email": user.email,
        "is_active": user.is_active
    }


@router.put("/{user_id}/role")
def assign_user_role(
    user_id: int,
    request: AssignRoleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Assign a role to a user.
    Requires: users.assign_role permission
    """
    # Check permission
    if not PermissionService.has_permission(current_user, "users.assign_role", db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: users.assign_role required"
        )
    
    # Get the user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Ensure the user belongs to the same company
    if user.company_id != current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot modify users from other companies"
        )
    
    # Verify the role exists
    role = db.query(Role).filter(Role.id == request.role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    # Assign the role
    user.role_id = request.role_id
    db.commit()
    db.refresh(user)
    
    return {
        "message": "Role assigned successfully",
        "user_id": user.id,
        "role_id": role.id,
        "role_name": role.name
    }
