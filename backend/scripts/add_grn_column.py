import sqlite3
import os

DB_PATH = "sql_app.db"

def upgrade():
    if not os.path.exists(DB_PATH):
        print("Database not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print("Tables in DB:", [t[0] for t in tables])

        cursor.execute("ALTER TABLE invoice_items ADD COLUMN grn_no VARCHAR(50)")
        conn.commit()
        print("Successfully added grn_no column to invoice_items.")
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e).lower():
            print("Column grn_no already exists.")
        else:
            print(f"Error adding column: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    upgrade()
