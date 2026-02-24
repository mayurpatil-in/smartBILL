# app/models/subscription_plan.py
from sqlalchemy import Column, Integer, String, Float, Boolean, JSON, DateTime
from sqlalchemy.sql import func
from app.database.base import Base

class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    price = Column(Float, nullable=False, default=0.0)
    duration_days = Column(Integer, nullable=False, default=30)
    max_users = Column(Integer, nullable=False, default=5)
    features = Column(JSON, nullable=True, default=[])
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
