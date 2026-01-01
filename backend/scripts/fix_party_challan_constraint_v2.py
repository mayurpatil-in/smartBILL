
import os
import sys

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.database.session import SessionLocal

def fix_constraints_v2():
    db = SessionLocal()
    try:
        print("Starting constraint fix V2 (Party Wise)...")
        
        # 1. Drop the constraint we JUST added (company + fy + number)
        try:
            print("Attempting to drop constraint 'uix_pc_company_fy_challan_number'...")
            db.execute(text("ALTER TABLE party_challan DROP CONSTRAINT uix_pc_company_fy_challan_number"))
            db.commit()
            print("Dropped constraint 'uix_pc_company_fy_challan_number'")
        except Exception as e:
            db.rollback()
            print(f"Constraint 'uix_pc_company_fy_challan_number' not found: {e}")

        # 2. Also ensure original constraint is gone (just in case)
        try:
            db.execute(text("ALTER TABLE party_challan DROP CONSTRAINT party_challan_challan_number_key"))
            db.commit()
        except:
            db.rollback()

        # 3. Add the NEW composite unique constraint (WITH party_id)
        try:
            print("Adding composite unique constraint 'uix_pc_company_fy_party_challan_number'...")
            db.execute(text("""
                ALTER TABLE party_challan 
                ADD CONSTRAINT uix_pc_company_fy_party_challan_number 
                UNIQUE (company_id, financial_year_id, party_id, challan_number)
            """))
            db.commit()
            print("Added composite unique constraint (Party Scoped)")
        except Exception as e:
            db.rollback()
            print(f"Failed to add composite constraint: {e}")

        print("Constraint fix V2 completed successfully!")
        
    except Exception as e:
        print(f"Error during migration: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_constraints_v2()
