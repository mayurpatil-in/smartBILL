from app.database.session import SessionLocal
from sqlalchemy import text
from sqlalchemy.exc import ProgrammingError, OperationalError

def add_column():
    db = SessionLocal()
    try:
        print("Attempting to add column 'party_rate' to 'items' table...")
        db.execute(text("ALTER TABLE items ADD COLUMN party_rate NUMERIC(10, 2) DEFAULT 0"))
        db.commit()
        print("Column added successfully.")
    except Exception as e:
        if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
             print("Column already exists. Skipping.")
        else:
             print(f"Error: {e}")
             db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_column()
