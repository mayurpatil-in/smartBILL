from sqlalchemy import create_engine, text
from app.core.config import settings

def fix_constraint():
    engine = create_engine(settings.DATABASE_URL)
    with engine.connect() as conn:
        conn = conn.execution_options(isolation_level="AUTOCOMMIT")
        
        print("Migrating Delivery Challan constraints...")
        
        # 1. Drop the existing global unique index/constraint
        # The error log showed: duplicate key value violates unique constraint "ix_delivery_challan_challan_number"
        try:
            conn.execute(text("DROP INDEX IF EXISTS ix_delivery_challan_challan_number;"))
            print("- Dropped index ix_delivery_challan_challan_number")
        except Exception as e:
            print(f"- Warning dropping index: {e}")
            
        # Also try dropping constraint if it exists separately
        try:
            conn.execute(text("ALTER TABLE delivery_challan DROP CONSTRAINT IF EXISTS ix_delivery_challan_challan_number;"))
            print("- Dropped constraint ix_delivery_challan_challan_number")
        except Exception as e:
            print(f"- Warning dropping constraint: {e}")

        # 2. Add Composite Unique Constraint (company_id, financial_year_id, challan_number)
        constraint_name = "uq_challan_company_fy_number"
        try:
            conn.execute(text(f"""
                ALTER TABLE delivery_challan 
                ADD CONSTRAINT {constraint_name} 
                UNIQUE (company_id, financial_year_id, challan_number);
            """))
            print(f"- Added composite unique constraint: {constraint_name}")
        except Exception as e:
            print(f"- Error adding composite constraint (might already exist or data violation): {e}")

        print("Migration complete!")

if __name__ == "__main__":
    fix_constraint()
