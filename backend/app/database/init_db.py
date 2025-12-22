from app.database.session import engine
from app.database.base import Base

from app.models.company import Company
from app.models.user import User
from app.models.financial_year import FinancialYear


def init_db():
    Base.metadata.create_all(bind=engine)
