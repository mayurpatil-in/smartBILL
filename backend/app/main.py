import sys
import asyncio
import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

# Windows Proactor Loop Logic for Playwright
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.auth.auth_router import router as auth_router
from app.services.pdf_service import pdf_manager

app = FastAPI(title=settings.PROJECT_NAME)

@app.on_event("startup")
async def startup_event():
    await pdf_manager.start()

@app.on_event("shutdown")
async def shutdown_event():
    await pdf_manager.stop()

# ===================== CORS =====================
print(f"DEBUG CORS: {settings.cors_origins} TYPE: {type(settings.cors_origins)}")
app.add_middleware(
    CORSMiddleware,
    # allow_origins=settings.cors_origins,  # ✅ ENV BASED
    # allow_origins=["*"], # DEBUG FORCE
    allow_origin_regex=".*", # 🔓 Allow ALL origins matching regex (Nuclear Option)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===================== STATIC FILES =====================
if not os.path.exists("uploads"):
    os.makedirs("uploads")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
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
from app.routers.party_challan import router as party_challan_router
from app.routers.employees import router as employees_router
from app.routers.reports import router as reports_router


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
app.include_router(party_challan_router)
app.include_router(employees_router)
app.include_router(employees_router)
app.include_router(reports_router)

from app.routers.public_challan import router as public_challan_router
from app.routers.public_reports import router as public_reports_router

app.include_router(public_challan_router)
app.include_router(public_reports_router)

# ===================== ROOT =====================
@app.get("/")
def root():
    return {"status": "OK"}
