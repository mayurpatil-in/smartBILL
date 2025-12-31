from sqlalchemy import create_engine, text
from app.core.config import settings

def migrate():
    engine = create_engine(settings.DATABASE_URL)
    with engine.connect() as conn:
        conn = conn.execution_options(isolation_level="AUTOCOMMIT")
        
        print("Adding document columns to employee_profiles...")
        columns = ["pan_doc_path", "aadhar_doc_path", "resume_doc_path"]
        
        for col in columns:
            try:
                conn.execute(text(f"ALTER TABLE employee_profiles ADD COLUMN {col} VARCHAR(255);"))
                print(f"- Added {col}")
            except Exception as e:
                print(f"- {col} might already exist: {e}")

        print("Migration complete!")

if __name__ == "__main__":
    migrate()
