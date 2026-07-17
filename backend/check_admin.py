import os
import sys
from sqlalchemy import create_engine, text

# Force passenger env to bypass any blocking imports if needed
os.environ["SERVER_ENV"] = "passenger"

try:
    from dotenv import load_dotenv
    load_dotenv(".env")

    # Connect directly to the database using the URL from .env
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("Error: DATABASE_URL not found in .env")
        sys.exit(1)

    print(f"Connecting to database...")
    engine = create_engine(db_url)
    
    with engine.connect() as conn:
        result = conn.execute(text("SELECT id, email, legacy_role FROM users WHERE email = 'admin@smartbill.com'"))
        user = result.fetchone()
        
        if user:
            print("\n✅ SUCCESS: Super Admin was found in the database!")
            print(f"ID: {user[0]}")
            print(f"Email: {user[1]}")
            print(f"Role: {user[2]}")
        else:
            print("\n❌ FAILED: The admin@smartbill.com user does NOT exist in the database.")
            print("To create it, the app needs to run its database initialization script.")

except Exception as e:
    print(f"\n❌ ERROR: Could not check the database. Details: {str(e)}")
