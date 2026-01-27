from sqlalchemy import create_engine, text
from app.core.config import settings

def verify_schema():
    print("Verifying VPS Database Schema & Data...")
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        # 1. Check users table columns
        print("\n[Users Table]")
        cols = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='users'")).fetchall()
        col_names = [c[0] for c in cols]
        print(f"Columns: {col_names}")
        if 'role_id' in col_names:
            print("✅ role_id present")
        else:
            print("❌ role_id MISSING")
            
        # 2. Check employee_profiles columns
        print("\n[Employee Profiles Table]")
        cols = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='employee_profiles'")).fetchall()
        col_names = [c[0] for c in cols]
        print(f"Columns: {col_names}")
        
        checks = ['work_hours_per_day', 'enable_tds', 'pd_percentage', 'professional_tax'] # pd_percentage might be tds_percentage
        if 'work_hours_per_day' in col_names:
             print("✅ work_hours_per_day present")
        else:
             print("❌ work_hours_per_day MISSING")
             
        if 'enable_tds' in col_names:
             print("✅ enable_tds present")
        else:
             print("❌ enable_tds MISSING")

        # 3. Check RBAC Data
        print("\n[RBAC Data]")
        role_count = conn.execute(text("SELECT count(*) FROM roles")).scalar()
        print(f"Roles Count: {role_count}")
        
        perm_count = conn.execute(text("SELECT count(*) FROM permissions")).scalar()
        print(f"Permissions Count: {perm_count}")
        
        company_admin = conn.execute(text("SELECT id FROM roles WHERE name='Company Admin'")).scalar()
        if company_admin:
            print("✅ Company Admin role exists")
        else:
             print("❌ Company Admin role MISSING")

if __name__ == "__main__":
    verify_schema()
