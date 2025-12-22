from fastapi import FastAPI
from app.core.config import settings
from app.auth.auth_router import router as auth_router
from app.routers.financial_year import router as fy_router

app = FastAPI(title=settings.PROJECT_NAME)

app.include_router(auth_router)
app.include_router(fy_router)


@app.get("/")
def health():
    return {"status": "OK"}
