# app/models/company.py
from sqlalchemy import (
    Column,
    Integer,
    String,
    Date,
    Boolean,
    DateTime,
    Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.base import Base


class Company(Base):
    __tablename__ = "company"

    # =========================
    # PRIMARY KEY
    # =========================
    id = Column(Integer, primary_key=True, index=True)

    # =========================
    # COMPANY DETAILS
    # =========================
    name = Column(String(255), nullable=False)
    gst_number = Column(String(20), unique=True, nullable=True)
    address = Column(String, nullable=True)
    phone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    logo = Column(String(500), nullable=True)

    # =========================
    # 🔐 SUBSCRIPTION CONTROL (SUPER ADMIN)
    # =========================
    subscription_start = Column(Date, nullable=False)
    subscription_end = Column(Date, nullable=False)
    is_active = Column(Boolean, default=True)

    # =========================
    # 🕒 AUDIT FIELDS (OPTIONAL)
    # =========================
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        onupdate=func.now()
    )

    # =========================
    # 🔁 RELATIONSHIPS
    # =========================
    users = relationship(
        "User",
        back_populates="company",
        cascade="all, delete-orphan"
    )

    # =========================
    # 📌 INDEXES (OPTIONAL)
    # =========================
    __table_args__ = (
        Index("ix_company_is_active", "is_active"),
    )
