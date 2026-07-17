import os
import sys

# Ensure the backend directory is in the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from app.core.config import settings
from app.database.init_db import init_db

def fix_db():
    print(f"Connecting to {settings.DATABASE_URL}...")
    
    # 1. Create all missing tables (holidays, salary_advances, etc.)
    print("\n--- STEP 1: Creating missing tables ---")
    try:
        init_db()
        print("✅ Missing tables created successfully.")
    except Exception as e:
        print(f"❌ Error creating tables: {e}")

    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        conn = conn.execution_options(isolation_level="AUTOCOMMIT")
        
        # 2. Fix Company Table (off_days)
        print("\n--- STEP 2: Adding missing columns to Company ---")
        try:
            conn.execute(text("ALTER TABLE company ADD COLUMN off_days JSON DEFAULT '[]'::json;"))
            print("✅ Added off_days to company")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                print("➖ Column off_days already exists in company.")
            else:
                print(f"❌ Error adding off_days: {e}")

        # 3. Fix EmployeeProfiles Table
        print("\n--- STEP 3: Adding missing columns to EmployeeProfiles ---")
        employee_cols = [
            ("company_employee_id", "INTEGER"),
            ("tds_percentage", "NUMERIC(5, 2) DEFAULT 0.00"),
            ("enable_tds", "BOOLEAN DEFAULT FALSE"),
            ("professional_tax", "NUMERIC(10, 2) DEFAULT 0.00"),
            ("work_hours_per_day", "INTEGER DEFAULT 8"),
            ("address", "VARCHAR(255)"),
            ("pan_number", "VARCHAR(20)"),
            ("aadhar_number", "VARCHAR(20)")
        ]
        
        for col, dtype in employee_cols:
            try:
                conn.execute(text(f"ALTER TABLE employee_profiles ADD COLUMN {col} {dtype};"))
                print(f"✅ Added {col} to employee_profiles")
            except Exception as e:
                if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                    print(f"➖ Column {col} already exists.")
                else:
                    print(f"❌ Error adding {col}: {e}")
                    
        # 4. Fix Attendance Table
        print("\n--- STEP 4: Adding missing columns to Attendance ---")
        attendance_cols = [
            ("overtime_hours", "NUMERIC(4, 2) DEFAULT 0.00"),
            ("bonus_amount", "NUMERIC(10, 2) DEFAULT 0.00")
        ]
        
        for col, dtype in attendance_cols:
            try:
                conn.execute(text(f"ALTER TABLE attendance ADD COLUMN {col} {dtype};"))
                print(f"✅ Added {col} to attendance")
            except Exception as e:
                if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                    print(f"➖ Column {col} already exists.")
                else:
                    print(f"❌ Error adding {col}: {e}")

        # 5. Fix Items Table (party_rate)
        print("\n--- STEP 5: Adding missing columns to Items ---")
        try:
            conn.execute(text("ALTER TABLE items ADD COLUMN party_rate NUMERIC(10, 2) DEFAULT 0;"))
            print("✅ Added party_rate to items")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                print("➖ Column party_rate already exists in items.")
            else:
                print(f"❌ Error adding party_rate: {e}")

    print("\n🎉 Database fix completely finished!")

if __name__ == "__main__":
    fix_db()
