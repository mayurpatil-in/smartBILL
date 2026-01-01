
import os
import sys

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.database.session import SessionLocal

def fix_constraints():
    db = SessionLocal()
    try:
        print("Starting constraint fix...")
        
        # 1. Drop existing unique index/constraint on challan_number
        try:
            print("Attempting to drop constraint 'party_challan_challan_number_key'...")
            db.execute(text("ALTER TABLE party_challan DROP CONSTRAINT party_challan_challan_number_key"))
            db.commit()
            print("Dropped constraint 'party_challan_challan_number_key'")
        except Exception as e:
            db.rollback()
            print(f"Constraint might not exist or has different name: {e}")
            
        try:
            print("Attempting to drop index 'ix_party_challan_challan_number'...")
            db.execute(text("DROP INDEX ix_party_challan_challan_number"))
            db.commit()
            print("Dropped index 'ix_party_challan_challan_number'")
        except Exception as e:
            db.rollback()
            print(f"Index might not exist: {e}")

        # 2. Add back the index (non-unique)
        try:
            print("Re-creating index 'ix_party_challan_challan_number' (non-unique)...")
            db.execute(text("CREATE INDEX ix_party_challan_challan_number ON party_challan (challan_number)"))
            db.commit()
            print("Created index 'ix_party_challan_challan_number'")
        except Exception as e:
            db.rollback()
            print(f"Failed to create index: {e}")

        # 3. Add the new composite unique constraint
        try:
            print("Adding composite unique constraint 'uix_pc_company_fy_challan_number'...")
            db.execute(text("""
                ALTER TABLE party_challan 
                ADD CONSTRAINT uix_pc_company_fy_challan_number 
                UNIQUE (company_id, financial_year_id, challan_number)
            """))
            db.commit()
            print("Added composite unique constraint")
        except Exception as e:
            db.rollback()
            print(f"Failed to add composite constraint (maybe duplicates exist?): {e}")

        print("Constraint fix completed successfully!")
        
    except Exception as e:
        print(f"Error during migration: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_constraints()
