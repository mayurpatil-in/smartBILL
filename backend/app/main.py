from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.auth.auth_router import router as auth_router
from app.routers.financial_year import router as fy_router
from app.routers.party import router as party_router
from app.routers.item import router as item_router
from app.routers.challan import router as challan_router
from app.routers.stock import router as stock_router
from app.routers.invoice import router as invoice_router
from app.routers.invoice_pdf import router as invoice_pdf_router
from app.routers.health import router as health_router
from app.routers.super_admin import router as super_admin_router
from app.routers import admin_company, admin_users
from app.routers.profile import router as profile_router
from app.routers.process import router as process_router

app = FastAPI(title=settings.PROJECT_NAME)

# ===================== CORS =====================
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,  # ✅ ENV BASED
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===================== ROUTERS =====================
app.include_router(auth_router)
app.include_router(fy_router)
app.include_router(party_router)
app.include_router(item_router)
app.include_router(challan_router)
app.include_router(stock_router)
app.include_router(invoice_router)
app.include_router(invoice_pdf_router)
app.include_router(health_router)
app.include_router(super_admin_router)
app.include_router(admin_company.router)
app.include_router(admin_users.router)
app.include_router(profile_router)
app.include_router(process_router)

# ===================== ROOT =====================
@app.get("/")
def root():
    return {"status": "OK"}
