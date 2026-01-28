import asyncio
import os
import sys

# Add backend directory to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.getcwd(), "backend", ".env"))

from app.core.config import get_backend_url
from app.core.security import create_url_signature, verify_url_signature
from app.database.session import SessionLocal

# 🔥 IMPORT YOUR Base + MODELS
from app.database.base import Base
from app.models import (
    company,
    user,
    financial_year,
    party,
    item,
    party_challan,  # Must be before delivery_challan
    party_challan_item,
    delivery_challan,
    delivery_challan_item,
    invoice,
    stock_transaction,
    process,
    audit_log,
    employee_profile,
    attendance,
    salary_advance,
    invoice_item,
    holiday,
    role,
    role_permission,
    permission,
    expense,
    payment,
    payment_allocation,
    notification,
)


def debug_qr_sim():
    print("--- Debugging QR Code Logic ---")
    
    # 1. Check Base URL
    base_url = get_backend_url()
    print(f"Base URL: {base_url}")
    
    # 2. Simulate Signature Generation
    db = SessionLocal()
    try:
        challan = db.query(delivery_challan.DeliveryChallan).first()
        if not challan:
            print("No challans found in DB to test.")
            return

        challan_id = challan.id
        print(f"Testing with Challan ID: {challan_id}")
        
        signature = create_url_signature(str(challan_id))
        url = f"{base_url}/public/challan/{challan_id}/download?token={signature}"
        print(f"Test URL: {url}")
        
        # 3. Hit the endpoint
        import requests
        print("Sending Request to local backend...")
        try:
            # Force localhost for testing if base_url is weird
            test_url = f"http://127.0.0.1:8000/public/challan/{challan_id}/download?token={signature}"
            resp = requests.get(test_url)
            print(f"Status Code: {resp.status_code}")
            if resp.status_code != 200:
                print(f"Error Response: {resp.text}")
            else:
                print("Success! (PDF content received)")
        except Exception as e:
            print(f"Request failed: {e}")

    finally:
        db.close()

if __name__ == "__main__":
    debug_qr_sim()
