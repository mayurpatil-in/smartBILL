
import sys
import os

# Add the parent directory to the Python path so we can import 'app'
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import create_engine, text
from app.core.config import settings

def add_logo_column():
    DATABASE_URL = settings.DATABASE_URL
    print(f"Connecting to {DATABASE_URL}")
    engine = create_engine(DATABASE_URL)

    with engine.connect() as conn:
        try:
            # Check if 'logo' column exists in 'company' table
            check_sql = text("SELECT column_name FROM information_schema.columns WHERE table_name='company' AND column_name='logo';")
            result = conn.execute(check_sql).fetchone()

            if not result:
                print("Adding 'logo' column to 'company' table...")
                conn.execute(text("ALTER TABLE company ADD COLUMN logo VARCHAR(500);"))
                conn.commit()
                print("Column 'logo' added successfully.")
            else:
                print("Column 'logo' already exists.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    add_logo_column()
