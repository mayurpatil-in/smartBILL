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
            # Check if 'processes' table exists
            check_table_sql = text("SELECT to_regclass('public.processes');")
            table_exists = conn.execute(check_table_sql).scalar()
            
            if not table_exists:
                print("Creating processes table...")
                conn.execute(text("""
                    CREATE TABLE processes (
                        id SERIAL PRIMARY KEY,
                        company_id INTEGER NOT NULL REFERENCES company(id) ON DELETE CASCADE,
                        name VARCHAR(255) NOT NULL,
                        is_active BOOLEAN DEFAULT TRUE
                    );
                """))
                conn.execute(text("CREATE INDEX ix_processes_id ON processes (id);"))
                conn.commit()
                print("Table processes created successfully.")
            else:
                print("Table processes already exists.")

            # Check and add timestamps to processes if missing
            timestamp_cols = ["created_at", "updated_at"]
            for col in timestamp_cols:
                check_ts_sql = text(f"SELECT column_name FROM information_schema.columns WHERE table_name='processes' AND column_name='{col}';")
                if not conn.execute(check_ts_sql).scalar():
                    print(f"Adding {col} to processes...")
                    conn.execute(text(f"ALTER TABLE processes ADD COLUMN {col} TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW();"))
                    conn.commit()

            # Check and add columns for 'items' table
            # New fields: po_number, casting_weight, scrap_weight, process_id
            columns_to_add = [
                ("po_number", "VARCHAR(50)"),
                ("casting_weight", "NUMERIC(10, 3) DEFAULT 0"),
                ("scrap_weight", "NUMERIC(10, 3) DEFAULT 0"),
                ("process_id", "INTEGER REFERENCES processes(id) ON DELETE SET NULL")
            ]

            for col_name, col_def in columns_to_add:
                check_sql = text(f"SELECT column_name FROM information_schema.columns WHERE table_name='items' AND column_name='{col_name}';")
                result = conn.execute(check_sql).fetchone()
                
                if not result:
                    print(f"Adding {col_name} column to items table...")
                    conn.execute(text(f"ALTER TABLE items ADD COLUMN {col_name} {col_def};"))
                    conn.commit()
                    print(f"Column {col_name} added successfully.")
                else:
                    print(f"Column {col_name} already exists.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    add_column()
