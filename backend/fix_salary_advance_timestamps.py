from sqlalchemy import create_engine, text
from app.core.config import settings

def fix_migration():
    engine = create_engine(settings.DATABASE_URL)
    with engine.connect() as conn:
        conn = conn.execution_options(isolation_level="AUTOCOMMIT")
        
        print("Adding timestamp columns to salary_advances...")
        try:
            conn.execute(text("ALTER TABLE salary_advances ADD COLUMN created_at TIMESTAMP DEFAULT NOW();"))
            print("- Added created_at")
        except Exception as e:
            print(f"- created_at error: {e}")

        try:
            conn.execute(text("ALTER TABLE salary_advances ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();"))
            print("- Added updated_at")
        except Exception as e:
            print(f"- updated_at error: {e}")

        print("Fix complete!")

if __name__ == "__main__":
    fix_migration()
