from sqlalchemy import create_engine, text
from app.core.config import settings

def fix_user_roles():
    print("Fixing User-Role Links...")
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        conn.execution_options(isolation_level="AUTOCOMMIT")
        
        # 1. Check current state
        null_roles = conn.execute(text("SELECT count(*) FROM users WHERE role_id IS NULL")).scalar()
        print(f"Users with NULL role_id: {null_roles}")
        
        if null_roles > 0:
            print("Linking users to roles based on legacy_role...")
            
            # Update based on legacy mapping if legacy_role exists
            conn.execute(text("""
                UPDATE users 
                SET role_id = (
                    SELECT id FROM roles WHERE name = CASE 
                        WHEN users.legacy_role = 'SUPER_ADMIN' THEN 'Super Admin'
                        WHEN users.legacy_role = 'COMPANY_ADMIN' THEN 'Company Admin'
                        WHEN users.legacy_role = 'USER' THEN 'Employee'
                        ELSE 'Employee'
                    END
                )
                WHERE role_id IS NULL AND legacy_role IS NOT NULL
            """))
            
            # Fallback: If legacy_role is missing or didn't match, default to Company Admin for specific emails or Employee
            # This is a safety net.
            conn.execute(text("""
                UPDATE users 
                SET role_id = (SELECT id FROM roles WHERE name = 'Super Admin')
                WHERE role_id IS NULL AND email LIKE '%admin%'
            """))
            
            remaining = conn.execute(text("SELECT count(*) FROM users WHERE role_id IS NULL")).scalar()
            print(f"Users still with NULL role_id: {remaining}")
            
            if remaining > 0:
                print("Assigning remaining users to 'Employee' role...")
                conn.execute(text("""
                     UPDATE users 
                     SET role_id = (SELECT id FROM roles WHERE name = 'Employee')
                     WHERE role_id IS NULL
                """))
            
            print("✅ User-Role links repaired.")
        else:
            print("✅ All users already have roles assigned.")

if __name__ == "__main__":
    fix_user_roles()
