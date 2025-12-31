from sqlalchemy import create_engine, text
from app.core.config import settings

def migrate():
    print(f"Connecting to {settings.DATABASE_URL}...")
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        print("Migrating Users table...")
        # Alter users table to make email and password nullable
        conn.execute(text("ALTER TABLE users ALTER COLUMN email DROP NOT NULL;"))
        conn.execute(text("ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;"))
        
        print("Migrating EmployeeProfiles table...")
        # Add new columns if they don't exist
        columns = [
            ("address", "VARCHAR(255)"),
            ("pan_number", "VARCHAR(20)"),
            ("aadhar_number", "VARCHAR(20)")
        ]
        
        for col, dtype in columns:
            try:
                conn.execute(text(f"ALTER TABLE employee_profiles ADD COLUMN {col} {dtype};"))
                print(f"Added column {col}")
            except Exception as e:
                print(f"Column {col} might already exist or error: {e}")
                
        conn.commit()
    print("Migration complete!")

if __name__ == "__main__":
    migrate()
