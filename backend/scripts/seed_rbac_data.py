from sqlalchemy import create_engine, text
from app.core.config import settings

def seed_rbac_data():
    print("Starting RBAC data seeding...")
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        conn.execution_options(isolation_level="AUTOCOMMIT")
        
        # 1. Seed Permissions
        print("Seeding Permissions...")
        permissions_data = [
            # Dashboard
            ('dashboard', 'view', 'dashboard.view', 'View dashboard'),
            
            # Invoices
            ('invoices', 'view', 'invoices.view', 'View invoices'),
            ('invoices', 'create', 'invoices.create', 'Create invoices'),
            ('invoices', 'edit', 'invoices.edit', 'Edit invoices'),
            ('invoices', 'delete', 'invoices.delete', 'Delete invoices'),
            ('invoices', 'approve', 'invoices.approve', 'Approve invoices'),
            
            # Parties
            ('parties', 'view', 'parties.view', 'View parties/customers'),
            ('parties', 'create', 'parties.create', 'Create parties'),
            ('parties', 'edit', 'parties.edit', 'Edit parties'),
            ('parties', 'delete', 'parties.delete', 'Delete parties'),
            
            # Items
            ('items', 'view', 'items.view', 'View items'),
            ('items', 'create', 'items.create', 'Create items'),
            ('items', 'edit', 'items.edit', 'Edit items'),
            ('items', 'delete', 'items.delete', 'Delete items'),
            
            # Expenses
            ('expenses', 'view', 'expenses.view', 'View expenses'),
            ('expenses', 'create', 'expenses.create', 'Create expenses'),
            ('expenses', 'edit', 'expenses.edit', 'Edit expenses'),
            ('expenses', 'delete', 'expenses.delete', 'Delete expenses'),
            ('expenses', 'approve', 'expenses.approve', 'Approve expenses'),
            
            # Payments
            ('payments', 'view', 'payments.view', 'View payments'),
            ('payments', 'create', 'payments.create', 'Create payments'),
            ('payments', 'edit', 'payments.edit', 'Edit payments'),
            ('payments', 'delete', 'payments.delete', 'Delete payments'),
            
            # Delivery Challans
            ('challans', 'view', 'challans.view', 'View delivery challans'),
            ('challans', 'create', 'challans.create', 'Create delivery challans'),
            ('challans', 'edit', 'challans.edit', 'Edit delivery challans'),
            ('challans', 'delete', 'challans.delete', 'Delete delivery challans'),
            ('challans', 'convert', 'challans.convert', 'Convert challan to invoice'),
            
            # Party Challans
            ('party_challans', 'view', 'party_challans.view', 'View party challans'),
            ('party_challans', 'create', 'party_challans.create', 'Create party challans'),
            ('party_challans', 'edit', 'party_challans.edit', 'Edit party challans'),
            ('party_challans', 'delete', 'party_challans.delete', 'Delete party challans'),
            
            # Employees
            ('employees', 'view', 'employees.view', 'View employees'),
            ('employees', 'create', 'employees.create', 'Create employees'),
            ('employees', 'edit', 'employees.edit', 'Edit employees'),
            ('employees', 'delete', 'employees.delete', 'Delete employees'),
            
            # Attendance
            ('attendance', 'view', 'attendance.view', 'View attendance'),
            ('attendance', 'create', 'attendance.create', 'Mark attendance'),
            ('attendance', 'edit', 'attendance.edit', 'Edit attendance'),
            
            # Salary
            ('salary', 'view', 'salary.view', 'View salary'),
            ('salary', 'create', 'salary.create', 'Process salary'),
            ('salary', 'approve', 'salary.approve', 'Approve salary'),
            
            # Reports
            ('reports', 'view', 'reports.view', 'View reports'),
            ('reports', 'export', 'reports.export', 'Export reports'),
            
            # Settings
            ('settings', 'view', 'settings.view', 'View settings'),
            ('settings', 'edit', 'settings.edit', 'Edit settings'),
            
            # Backup
            ('backup', 'view', 'backup.view', 'View backups'),
            ('backup', 'create', 'backup.create', 'Create backups'),
            ('backup', 'restore', 'backup.restore', 'Restore backups'),
            
            # Users
            ('users', 'view', 'users.view', 'View users'),
            ('users', 'create', 'users.create', 'Create users'),
            ('users', 'edit', 'users.edit', 'Edit users'),
            ('users', 'delete', 'users.delete', 'Delete users'),
            ('users', 'assign_role', 'users.assign_role', 'Assign roles to users'),
            
            # Roles
            ('roles', 'view', 'roles.view', 'View roles'),
            ('roles', 'create', 'roles.create', 'Create roles'),
            ('roles', 'edit', 'roles.edit', 'Edit roles'),
            ('roles', 'delete', 'roles.delete', 'Delete roles'),
            
            # Employee Portal
            ('employee_portal', 'view', 'employee_portal.view', 'Access employee portal'),
            ('employee_portal', 'view_attendance', 'employee_portal.view_attendance', 'View own attendance'),
            ('employee_portal', 'view_salary', 'employee_portal.view_salary', 'View own salary slips'),
            ('employee_portal', 'download_salary', 'employee_portal.download_salary', 'Download own salary slips'),
            ('employee_portal', 'view_profile', 'employee_portal.view_profile', 'View own profile'),
        ]
        
        for module, action, code, description in permissions_data:
            existing = conn.execute(text("SELECT 1 FROM permissions WHERE code = :code"), {"code": code}).scalar()
            if not existing:
                print(f"Adding permission: {code}")
                conn.execute(text(
                    "INSERT INTO permissions (module, action, code, description) VALUES (:module, :action, :code, :description)"
                ), {"module": module, "action": action, "code": code, "description": description})
                
        # 2. Seed Roles
        print("\nSeeding Roles...")
        roles_data = [
            (None, 'Super Admin', 'Full system access', True),
            (None, 'Company Admin', 'Full company access', True),
            (None, 'Accountant', 'Finance and accounting access', True),
            (None, 'Sales Manager', 'Sales and customer management', True),
            (None, 'Warehouse Manager', 'Inventory and warehouse management', True),
            (None, 'HR Manager', 'Human resources management', True),
            (None, 'Employee', 'Basic employee access', True),
        ]
        
        for company_id, name, description, is_system_role in roles_data:
            existing = conn.execute(text("SELECT 1 FROM roles WHERE name = :name"), {"name": name}).scalar()
            if not existing:
                print(f"Adding role: {name}")
                conn.execute(text(
                    "INSERT INTO roles (company_id, name, description, is_system_role, is_active, created_at, updated_at) VALUES (:company_id, :name, :description, :is_system_role, true, now(), now())"
                ), {"company_id": company_id, "name": name, "description": description, "is_system_role": is_system_role})

        # 3. Assign Permissions to Roles (Basic set)
        print("\nAssigning Permissions to Roles...")
        
        # Get Role IDs
        roles = {}
        for role_name in ['Super Admin', 'Company Admin', 'Accountant', 'Sales Manager', 'Warehouse Manager', 'HR Manager', 'Employee']:
            rid = conn.execute(text("SELECT id FROM roles WHERE name = :name"), {"name": role_name}).scalar()
            if rid:
                roles[role_name] = rid
                
        # Super Admin gets ALL
        if 'Super Admin' in roles:
            print("Assigning ALL to Super Admin")
            conn.execute(text("""
                INSERT INTO role_permissions (role_id, permission_id)
                SELECT :role_id, id FROM permissions
                ON CONFLICT DO NOTHING
            """), {"role_id": roles['Super Admin']})
            
        # Company Admin gets ALL except super admin specific (simplified to all for now or filter if needed)
        if 'Company Admin' in roles:
            print("Assigning all to Company Admin")
             # Assuming Company Admin acts almost like Super Admin for their company
            conn.execute(text("""
                INSERT INTO role_permissions (role_id, permission_id)
                SELECT :role_id, id FROM permissions
                ON CONFLICT DO NOTHING
            """), {"role_id": roles['Company Admin']})

        # Employee Role (just portal permissions)
        if 'Employee' in roles:
            print("Assigning permissions to Employee")
            conn.execute(text("""
                INSERT INTO role_permissions (role_id, permission_id)
                SELECT :role_id, id FROM permissions 
                WHERE module = 'employee_portal' OR module IN ('dashboard', 'attendance', 'salary')
                ON CONFLICT DO NOTHING
            """), {"role_id": roles['Employee']})

        print("Seeding complete!")

if __name__ == "__main__":
    seed_rbac_data()
