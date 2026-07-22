import os
import sys
from sqlalchemy import create_engine, text

# Add backend dir to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings

def create_indexes():
    engine = create_engine(settings.DATABASE_URL)
    with engine.connect() as conn:
        print("Checking/Creating composite indexes on party_challan...")
        try:
            conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_pc_company_fy_date ON party_challan (company_id, financial_year_id, challan_date DESC);"
            ))
            conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_pc_company_fy_status ON party_challan (company_id, financial_year_id, status);"
            ))
            conn.commit()
            print("Successfully created composite indexes for 'party_challan'!")
        except Exception as e:
            print(f"Index creation output/notice: {e}")

if __name__ == "__main__":
    create_indexes()
