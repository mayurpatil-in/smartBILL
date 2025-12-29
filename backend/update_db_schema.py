import os
from sqlalchemy import create_engine, text
from app.core.config import settings

# Override config if needed, but it should pick up .env
DATABASE_URL = settings.DATABASE_URL

def add_column():
    print(f"Connecting to {DATABASE_URL}")
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        try:
            # Check if column exists
            check_sql = text("SELECT column_name FROM information_schema.columns WHERE table_name='party' AND column_name='is_active';")
            result = conn.execute(check_sql).fetchone()
            
            if not result:
                print("Adding is_active column to party table...")
                # Add column
                conn.execute(text("ALTER TABLE party ADD COLUMN is_active BOOLEAN DEFAULT TRUE;"))
                conn.commit()
                print("Column added successfully.")
            else:
                print("Column is_active already exists.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    add_column()
