from app.database.session import SessionLocal
from sqlalchemy import text
from sqlalchemy.exc import ProgrammingError, OperationalError

def add_column():
    db = SessionLocal()
    try:
        print("Attempting to add column 'company_employee_id'...")
        db.execute(text("ALTER TABLE employee_profiles ADD COLUMN company_employee_id INTEGER"))
        db.commit()
        print("Column added successfully.")
    except Exception as e:
        if "already exists" in str(e) or "duplicate column" in str(e):
             print("Column already exists. Skipping.")
        else:
             print(f"Error: {e}")
             db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_column()
