from sqlalchemy import create_engine, text
from app.core.config import settings

def fix_db():
    print(f"Connecting to {settings.DATABASE_URL}...")
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        conn = conn.execution_options(isolation_level="AUTOCOMMIT")
        
        # 1. Fix EmployeeProfiles Table
        print("Checking employee_profiles table...")
        employee_cols = [
            ("company_employee_id", "INTEGER"),
            ("tds_percentage", "NUMERIC(5, 2) DEFAULT 0.00"),
            ("enable_tds", "BOOLEAN DEFAULT FALSE"),
            ("professional_tax", "NUMERIC(10, 2) DEFAULT 0.00"),
            ("work_hours_per_day", "INTEGER DEFAULT 8")
        ]
        
        for col, dtype in employee_cols:
            try:
                conn.execute(text(f"ALTER TABLE employee_profiles ADD COLUMN {col} {dtype};"))
                print(f"✅ Added {col} to employee_profiles")
            except Exception as e:
                if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                    print(f"➖ Column {col} already exists in employee_profiles.")
                else:
                    print(f"❌ Error adding {col}: {e}")

        # 2. Fix Items Table (Ensure party_rate is definitely there)
        print("\nChecking items table...")
        item_cols = [
            ("party_rate", "NUMERIC(10, 2) DEFAULT 0")
        ]
        
        for col, dtype in item_cols:
            try:
                conn.execute(text(f"ALTER TABLE items ADD COLUMN {col} {dtype};"))
                print(f"✅ Added {col} to items")
            except Exception as e:
                if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                    print(f"➖ Column {col} already exists in items.")
                else:
                    print(f"❌ Error adding {col}: {e}")

    print("\nDatabase fix completed!")

if __name__ == "__main__":
    fix_db()
