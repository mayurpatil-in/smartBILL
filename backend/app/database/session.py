import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import settings

# If running under Passenger (prefork worker model), use NullPool
# to prevent connection pool deadlocks after the process forks.
is_passenger = os.getenv("SERVER_ENV") == "passenger"
engine_kwargs = {"pool_pre_ping": True}
if is_passenger:
    engine_kwargs["poolclass"] = NullPool

engine = create_engine(
    settings.DATABASE_URL,
    **engine_kwargs
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
