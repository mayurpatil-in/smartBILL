from sqlalchemy import create_engine, text
from app.core.config import settings

def fix_users_table():
    print("Starting repair of users table...")
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        conn.execution_options(isolation_level="AUTOCOMMIT")
        
        # 1. Check if role_id exists
        print("Checking for role_id column...")
        result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='role_id'"))
        if not result.scalar():
            print("role_id missing. Adding it...")
            conn.execute(text("ALTER TABLE users ADD COLUMN role_id INTEGER"))
            conn.execute(text("ALTER TABLE users ADD CONSTRAINT fk_users_role_id FOREIGN KEY (role_id) REFERENCES roles(id)"))
        else:
            print("role_id already exists.")
            
        # 2. Check if legacy_role exists
        print("Checking for legacy_role column...")
        result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='legacy_role'"))
        if not result.scalar():
            print("legacy_role missing. Adding it...")
            conn.execute(text("ALTER TABLE users ADD COLUMN legacy_role VARCHAR(50)"))
            
            # Migrate data if possible
            print("Migrating role data to legacy_role...")
            try:
                # We assume 'role' column still exists if we are in this state
                conn.execute(text("""
                    UPDATE users 
                    SET legacy_role = CASE 
                        WHEN role = 'SUPER_ADMIN' THEN 'SUPER_ADMIN'
                        WHEN role = 'COMPANY_ADMIN' THEN 'COMPANY_ADMIN'
                        WHEN role = 'USER' THEN 'USER'
                        ELSE 'USER'
                    END
                """))
            except Exception as e:
                print(f"Warning: Could not migrate legacy data (maybe 'role' column missing?): {e}")
        else:
            print("legacy_role already exists.")

        # 3. Populate role_id based on legacy_role
        print("Populating role_id...")
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
            WHERE legacy_role IS NOT NULL
        """))
        
        # 4. Drop old 'role' column if it exists
        print("Checking for old 'role' column...")
        result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='role'"))
        if result.scalar():
            print("Dropping old 'role' column...")
            try:
                conn.execute(text("ALTER TABLE users DROP COLUMN role"))
            except Exception as e:
                 print(f"Error dropping role column: {e}")

        print("Repair complete!")

if __name__ == "__main__":
    fix_users_table()
