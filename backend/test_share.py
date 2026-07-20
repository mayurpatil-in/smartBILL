import asyncio
from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.routers.challan import share_challan
from app.models.delivery_challan import DeliveryChallan

async def test():
    db = SessionLocal()
    try:
        challan = db.query(DeliveryChallan).first()
        if not challan:
            print("No challan found")
            return
            
        print(f"Testing with challan {challan.id}, company {challan.company_id}")
        # Note: share_challan is an async function
        result = await share_challan(
            challan_id=challan.id,
            company_id=challan.company_id,
            db=db,
            _=None
        )
        print("Success!", result)
    except Exception as e:
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test())
