from app.core.config import settings
from sqlalchemy import create_engine, text

engine = create_engine(settings.DATABASE_URL)
with engine.connect() as conn:
    rows = conn.execute(text("SELECT id, module, action, code FROM permissions WHERE code IN ('ai_insights.view', 'challan_tracker.view')")).fetchall()
    print("Found permissions:", rows)
