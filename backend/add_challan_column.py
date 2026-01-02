from sqlalchemy import create_engine, text
import os
from app.core.config import settings

# Database URL
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

def add_column():
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    with engine.connect() as conn:
        try:
            # Check if column exists
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='invoice_items' AND column_name='delivery_challan_item_id'"))
            if result.fetchone():
                print("Column 'delivery_challan_item_id' already exists.")
            else:
                print("Adding column 'delivery_challan_item_id' to 'invoice_items' table...")
                conn.execute(text("ALTER TABLE invoice_items ADD COLUMN delivery_challan_item_id INTEGER REFERENCES delivery_challan_items(id)"))
                conn.commit()
                print("Column added successfully.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    add_column()
