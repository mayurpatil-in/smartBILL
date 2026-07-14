import os
import sys

# Ensure backend directory is in path
sys.path.append(os.getcwd())

# Load environment
from dotenv import load_dotenv
load_dotenv()

from app.database.session import SessionLocal

from app.models.subscription_plan import SubscriptionPlan

def fix_company_plans():
    db = SessionLocal()
    try:
        # Find the premium plan
        plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.name == "Premium Plan").first()
        if plan:
            print("Fixing Premium Plan features format...")
            # Fix features to be a list of strings instead of a dict
            plan.features = ["Everything in basic", "Custom domains", "Priority support"]
            db.commit()
            print("Fixed successfully!")
        else:
            print("Plan not found!")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_company_plans()
