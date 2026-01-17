import sqlite3
import os

# Get the database path
db_path = os.path.expanduser("C:/Users/mayur/AppData/Roaming/SmartBill/sql_app.db")

# Connect to the database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Query the users table
cursor.execute("SELECT id, email, password_hash, role_id, legacy_role, company_id FROM users WHERE email = 'admin@smartbill.com'")
user = cursor.fetchone()

if user:
    print(f"User found!")
    print(f"ID: {user[0]}")
    print(f"Email: {user[1]}")
    print(f"Password hash: {user[2]}")
    print(f"Role ID: {user[3]}")
    print(f"Legacy Role: {user[4]}")
    print(f"Company ID: {user[5]}")
else:
    print("User NOT found!")

# Check all users
cursor.execute("SELECT id, email, role_id, legacy_role FROM users")
all_users = cursor.fetchall()
print(f"\nTotal users in database: {len(all_users)}")
for u in all_users:
    print(f"  - ID: {u[0]}, Email: {u[1]}, Role ID: {u[2]}, Legacy Role: {u[3]}")

conn.close()
