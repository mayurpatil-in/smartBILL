import sys
import os
sys.path.append(os.getcwd())

from sqlalchemy import create_engine, text
from app.core.config import settings

def upgrade():
    print(f"Connecting to DB: {settings.DATABASE_URL}")
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        try:
            # Check if column exists
            # Postgres specific query to check column
            check_query = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='invoice_items' AND column_name='grn_no';
            """)
            result = conn.execute(check_query)
            if result.fetchone():
                print("Column grn_no already exists.")
            else:
                print("Adding grn_no column...")
                conn.execute(text("ALTER TABLE invoice_items ADD COLUMN grn_no VARCHAR(50)"))
                conn.commit()
                print("Successfully added grn_no column.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    upgrade()
