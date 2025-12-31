from sqlalchemy import create_engine, text
from app.core.config import settings

def migrate():
    engine = create_engine(settings.DATABASE_URL)
    with engine.connect() as conn:
        conn = conn.execution_options(isolation_level="AUTOCOMMIT")
        
        # 1. Create salary_advances table
        print("Creating salary_advances table...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS salary_advances (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                amount NUMERIC(10, 2) NOT NULL,
                date DATE NOT NULL,
                reason VARCHAR(255),
                is_deducted BOOLEAN DEFAULT FALSE
            );
        """))
        
        # 2. Add columns to attendance table
        print("Adding columns to attendance table...")
        try:
            conn.execute(text("ALTER TABLE attendance ADD COLUMN overtime_hours NUMERIC(4, 2) DEFAULT 0.00;"))
            print("- Added overtime_hours")
        except Exception as e:
            print(f"- overtime_hours might already exist: {e}")

        try:
            conn.execute(text("ALTER TABLE attendance ADD COLUMN bonus_amount NUMERIC(10, 2) DEFAULT 0.00;"))
            print("- Added bonus_amount")
        except Exception as e:
            print(f"- bonus_amount might already exist: {e}")

        print("Migration complete!")

if __name__ == "__main__":
    migrate()
