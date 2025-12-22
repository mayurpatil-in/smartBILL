from fastapi import FastAPI
from app.core.config import settings
from app.auth.auth_router import router as auth_router

app = FastAPI(title=settings.PROJECT_NAME)

app.include_router(auth_router)


@app.get("/")
def health():
    return {"status": "OK"}
