import sys
import asyncio
import os
import logging
from fastapi import FastAPI, Request, Response
# Force reload - E-Way Bill endpoints added
from fastapi.staticfiles import StaticFiles

# Windows Proactor Loop Logic for Playwright
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.logger import logger, RequestLoggingMiddleware

# ===================== SENTRY ERROR MONITORING =====================
# Reads SENTRY_DSN from .env — if not set, Sentry is silently disabled.
# Set SENTRY_DSN in your .env to enable crash reporting in production.
_sentry_dsn = os.getenv("SENTRY_DSN", "").strip()
if _sentry_dsn:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
    from sentry_sdk.integrations.logging import LoggingIntegration
    sentry_sdk.init(
        dsn=_sentry_dsn,
        integrations=[
            FastApiIntegration(),          # Captures FastAPI request context
            SqlalchemyIntegration(),       # Captures slow/failed DB queries
            LoggingIntegration(
                level=logging.WARNING,     # Captures WARNING+ logs as breadcrumbs
                event_level=logging.ERROR, # Sends ERROR+ logs as Sentry events
            ),
        ],
        traces_sample_rate=0.1,           # 10% of requests → performance tracing
        environment=os.getenv("ENV", "development"),
        release=os.getenv("APP_VERSION", "unknown"),
    )
    logger.info("✅ Sentry error monitoring initialized.")
else:
    logger.info("ℹ️ Sentry DSN not configured — error monitoring disabled.")
# ==================================================================

from app.core.config import settings
from app.auth.auth_router import router as auth_router
from app.auth.two_factor_router import router as two_factor_router
from app.services.pdf_service import pdf_manager
from app.services.backup_service import backup_manager
from app.core.paths import APP_DATA_DIR, UPLOAD_DIR, LOG_DIR, BACKUP_DIR, DB_PATH, DATABASE_URL

# [CRITICAL] Import all models to ensure SQLAlchemy can resolve string references
# Import in dependency order: base models first, then models with foreign keys
from app.models.role import Role
from app.models.permission import Permission
from app.models.subscription_plan import SubscriptionPlan
from app.models.company import Company
from app.models.financial_year import FinancialYear
from app.models.party import Party
from app.models.item import Item
from app.models.process import Process
from app.models.role_permission import RolePermission
from app.models.user import User
from app.models.employee_profile import EmployeeProfile
from app.models.party_challan import PartyChallan
from app.models.party_challan_item import PartyChallanItem
from app.models.delivery_challan import DeliveryChallan
from app.models.delivery_challan_item import DeliveryChallanItem
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.payment import Payment
from app.models.payment_allocation import PaymentAllocation
from app.models.expense import Expense
from app.models.stock_transaction import StockTransaction
from app.models.attendance import Attendance
from app.models.salary_advance import SalaryAdvance
from app.models.notification import Notification
from app.models.audit_log import AuditLog
from app.models.holiday import Holiday
from app.models.client_login import ClientLogin
from app.models.pdi_report import PDIReport

# [NEW] Import super admin creator
from create_super_admin import create_default_super_admin

# [NEW] Alembic for Migrations
from alembic.config import Config
from alembic import command

# [CRITICAL] Database Configuration Logic
# For Desktop App (frozen): FORCE AppData SQLite path to ensure write permissions.
# For Dev Mode: Respect settings (loaded from .env or default), allowing Postgres.

is_frozen = getattr(sys, 'frozen', False)

if is_frozen:
    # Desktop App: Always use safe AppData path
    deployment_db_url = DATABASE_URL # Imported from app.core.paths
    settings.DATABASE_URL = deployment_db_url
    deployment_db_url = deployment_db_url # For migrations
    logger.info(f"FROZEN MODE: Forced Database URL to AppData: {deployment_db_url}")
else:
    # Dev Mode: Trust Settings (from .env or default)
    deployment_db_url = settings.DATABASE_URL
    logger.info(f"DEV MODE: Using configured Database URL: {deployment_db_url}")

logger.info(f"Starting SmartBill Backend. Data Dir: {APP_DATA_DIR}")

def run_migrations():
    """Run Alembic migrations to ensure DB schema is up to date."""
    try:
        logger.info("Running database migrations...")
        # Use absolute path to alembic.ini so it works on both desktop and server
        # (working directory may differ on shared hosting)
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        alembic_ini_path = os.path.join(backend_dir, "alembic.ini")
        alembic_cfg = Config(alembic_ini_path)
        # Force the config to use our computed AppData DB URL
        alembic_cfg.set_main_option("sqlalchemy.url", deployment_db_url)
        # Run upgrade head
        command.upgrade(alembic_cfg, "head")
        logger.info("Database migrations completed successfully.")
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        # We don't raise here to allow app to start even if migration fails (though risky)

from contextlib import asynccontextmanager

# [NEW] Import init_db for fallback table creation
from app.database.init_db import init_db

@asynccontextmanager
async def app_lifespan(app: FastAPI):
    logger.info("Startup event triggered.")
    print("STARTUP: Event triggered.") # Logs to backend_entry.log
    
    # =========================================================================
    # FAST FAST STARTUP FOR PASSENGER (SHARED HOSTING)
    # =========================================================================
    if os.getenv("SERVER_ENV") == "passenger":
        logger.info("Passenger environment detected. Bypassing background tasks on startup to prevent deadlocks.")
        print("STARTUP: Running on Passenger. Bypassing background threads.")
    else:
        try:
            import asyncio
            
            # Define a synchronous function to run all the DB setup
            def sync_db_setup():
                print("STARTUP: Running init_db() to create tables...")
                init_db()
                print("STARTUP: init_db() completed.")
                
                print("STARTUP: Running migrations...")
                run_migrations()
                print("STARTUP: Migrations completed.")
                
                print("STARTUP: Creating default Super Admin...")
                create_default_super_admin()
                print("STARTUP: Super Admin creation step done.")

            # 1 & 2 & 4. Run synchronous DB tasks in a background thread 
            # so they don't block the a2wsgi event loop on Passenger!
            await asyncio.to_thread(sync_db_setup)

            # 3. Start Services
            await pdf_manager.start()
            backup_manager.start_scheduler()
            
            logger.info("Startup complete.")
        except Exception as e:
            logger.error(f"Startup error: {e}")
            print(f"STARTUP ERROR: {e}")

    yield

    await pdf_manager.stop()

app = FastAPI(title=settings.PROJECT_NAME, lifespan=app_lifespan)

# [SECURITY] Rate Limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Removed deprecated on_event

# ===================== PNA MIDDLEWARE =====================
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from fastapi import Request, Response

class PrivateNetworkAccessMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        # Check if the PNA header is requested (usually in OPTIONS)
        if request.method == "OPTIONS" and request.headers.get("Access-Control-Request-Private-Network"):
            response.headers["Access-Control-Allow-Private-Network"] = "true"
        return response

# ===================== MAINTENANCE MIDDLEWARE =====================
from fastapi.responses import JSONResponse
from app.core.maintenance import is_maintenance_mode

class MaintenanceMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if is_maintenance_mode():
            path = request.url.path
            # Logins, super-admin API, API docs must be accessible
            if not any(path.startswith(prefix) for prefix in [
                "/auth/login",
                "/super-admin",
                "/profile",
                "/health",
                "/docs",
                "/openapi.json"
            ]):
                return JSONResponse(
                    status_code=503,
                    content={"detail": "System is currently under maintenance. Please try again later.", "is_maintenance": True}
                )
        return await call_next(request)

# ===================== CORS =====================
# Priority: Use CORS_ORIGINS from .env if configured, otherwise fallback to localhost for dev
# For VPS: Set CORS_ORIGINS in .env with your production domains
# For Dev: Defaults to localhost ports

# Check if settings has configured CORS origins (from .env)
if hasattr(settings, "cors_origins") and settings.cors_origins and settings.cors_origins != ["*"]:
    # Use origins from settings (loaded from CORS_ORIGINS in .env)
    origins = [str(origin) for origin in settings.cors_origins]
else:
    # Fallback to localhost for local development
    origins = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(PrivateNetworkAccessMiddleware)
app.add_middleware(MaintenanceMiddleware)

# ===================== STATIC FILES =====================
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
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
from app.routers.payment import router as payment_router
from app.routers.expense import router as expense_router
from app.routers.backup import router as backup_router
from app.routers.roles import router as roles_router
from app.routers.users import router as users_router


# ===================== ROUTERS =====================
app.include_router(auth_router)
app.include_router(two_factor_router)
app.include_router(fy_router)
app.include_router(party_router)
app.include_router(item_router)
app.include_router(challan_router)
app.include_router(stock_router)
app.include_router(invoice_router)
app.include_router(payment_router)
app.include_router(expense_router)
app.include_router(backup_router)
app.include_router(roles_router)
app.include_router(users_router)
app.include_router(invoice_pdf_router)
app.include_router(health_router)
app.include_router(super_admin_router)
app.include_router(admin_company.router)
app.include_router(admin_users.router)


app.include_router(profile_router)
app.include_router(process_router)
app.include_router(party_challan_router)
app.include_router(employees_router)

app.include_router(reports_router)

from app.routers.notification import router as notification_router
app.include_router(notification_router)

from app.routers.holidays import router as holidays_router
app.include_router(holidays_router)

from app.routers.company_settings import router as company_settings_router
app.include_router(company_settings_router)

from app.routers.public_challan import router as public_challan_router
from app.routers.public_reports import router as public_reports_router
from app.routers.public_verify import router as public_verify_router

app.include_router(public_challan_router)
app.include_router(public_reports_router)
app.include_router(public_verify_router)

from app.routers.invoice import public_router as public_invoice_router
app.include_router(public_invoice_router)

# [NEW] Client Portal Routers
from app.routers import client_auth, client_portal
app.include_router(client_auth.router)
app.include_router(client_portal.router)

from app.routers.pdi_report import router as pdi_report_router
app.include_router(pdi_report_router, prefix="/pdi", tags=["PDI Reports"])

# [NEW] AI Insights Router
from app.routers.ai_insights import router as ai_insights_router
app.include_router(ai_insights_router)

# ===================== ROOT =====================
@app.get("/")
def root():
    return {"status": "OK"}

if __name__ == "__main__":
    import uvicorn
    # Explicitly run uvicorn when executed as a script/executable
    uvicorn.run(app, host="127.0.0.1", port=8000)