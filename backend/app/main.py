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

app = FastAPI(title=settings.PROJECT_NAME)

# ✅ ADD THIS BLOCK (VERY IMPORTANT)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://192.168.31.137:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_router)
app.include_router(fy_router)
app.include_router(party_router)
app.include_router(item_router)
app.include_router(challan_router)
app.include_router(stock_router)
app.include_router(invoice_router)
app.include_router(invoice_pdf_router)

@app.get("/")
def health():
    return {"status": "OK"}
