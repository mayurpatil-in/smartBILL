"""add_employee_portal_permissions

Revision ID: add_employee_portal
Revises: c2534155eb06
Create Date: 2026-01-17 20:22:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_employee_portal'
down_revision: Union[str, Sequence[str], None] = 'c2534155eb06'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add employee portal specific permissions."""
    connection = op.get_bind()
    
    # Add new employee portal permissions
    employee_portal_permissions = [
        ('employee_portal', 'view', 'employee_portal.view', 'Access employee portal'),
        ('employee_portal', 'view_attendance', 'employee_portal.view_attendance', 'View own attendance'),
        ('employee_portal', 'view_salary', 'employee_portal.view_salary', 'View own salary slips'),
        ('employee_portal', 'download_salary', 'employee_portal.download_salary', 'Download own salary slips'),
        ('employee_portal', 'view_profile', 'employee_portal.view_profile', 'View own profile'),
        ('users', 'assign_role', 'users.assign_role', 'Assign roles to users'),
    ]
    
    for module, action, code, description in employee_portal_permissions:
        # Check if permission already exists
        existing = connection.execute(
            sa.text("SELECT id FROM permissions WHERE code = :code"),
            {"code": code}
        ).scalar()
        
        if not existing:
            connection.execute(sa.text(
                "INSERT INTO permissions (module, action, code, description) VALUES (:module, :action, :code, :description)"
            ), {"module": module, "action": action, "code": code, "description": description})
    
    # Assign employee portal permissions to Employee role
    employee_role_id = connection.execute(
        sa.text("SELECT id FROM roles WHERE name = 'Employee'")
    ).scalar()
    
    if employee_role_id:
        employee_portal_perm_codes = [
            'employee_portal.view',
            'employee_portal.view_attendance',
            'employee_portal.view_salary',
            'employee_portal.download_salary',
            'employee_portal.view_profile',
        ]
        
        for perm_code in employee_portal_perm_codes:
            perm_id = connection.execute(
                sa.text("SELECT id FROM permissions WHERE code = :code"),
                {"code": perm_code}
            ).scalar()
            
            if perm_id:
                # Check if already assigned
                existing_assignment = connection.execute(
                    sa.text("SELECT id FROM role_permissions WHERE role_id = :role_id AND permission_id = :perm_id"),
                    {"role_id": employee_role_id, "perm_id": perm_id}
                ).scalar()
                
                if not existing_assignment:
                    connection.execute(sa.text(
                        "INSERT INTO role_permissions (role_id, permission_id) VALUES (:role_id, :permission_id)"
                    ), {"role_id": employee_role_id, "permission_id": perm_id})
    
    # Assign users.assign_role to Company Admin
    company_admin_id = connection.execute(
        sa.text("SELECT id FROM roles WHERE name = 'Company Admin'")
    ).scalar()
    
    if company_admin_id:
        perm_id = connection.execute(
            sa.text("SELECT id FROM permissions WHERE code = 'users.assign_role'")
        ).scalar()
        
        if perm_id:
            existing_assignment = connection.execute(
                sa.text("SELECT id FROM role_permissions WHERE role_id = :role_id AND permission_id = :perm_id"),
                {"role_id": company_admin_id, "perm_id": perm_id}
            ).scalar()
            
            if not existing_assignment:
                connection.execute(sa.text(
                    "INSERT INTO role_permissions (role_id, permission_id) VALUES (:role_id, :permission_id)"
                ), {"role_id": company_admin_id, "permission_id": perm_id})


def downgrade() -> None:
    """Remove employee portal permissions."""
    connection = op.get_bind()
    
    # Delete employee portal permissions
    connection.execute(sa.text(
        "DELETE FROM permissions WHERE module = 'employee_portal'"
    ))
    
    connection.execute(sa.text(
        "DELETE FROM permissions WHERE code = 'users.assign_role'"
    ))
