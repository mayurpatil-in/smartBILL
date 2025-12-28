"""initial schema

Revision ID: 9ceebd59829b
Revises:
Create Date: 2025-12-27 14:14:15.089847
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "9ceebd59829b"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # ⚠️ DEV ONLY — remove in production
    op.drop_index(op.f("ix_stock_transactions_id"), table_name="stock_transactions")
    op.drop_table("stock_transactions")
    op.drop_table("invoice_items")
    op.drop_table("delivery_challan_items")

    # =====================================================
    # 1️⃣ COMPANY SUBSCRIPTION (SAFE ADD)
    # =====================================================
    op.add_column("company", sa.Column("subscription_start", sa.Date(), nullable=True))
    op.add_column("company", sa.Column("subscription_end", sa.Date(), nullable=True))
    op.add_column(
        "company",
        sa.Column("is_active", sa.Boolean(), server_default=sa.true()),
    )

    # Backfill existing companies
    op.execute("""
        UPDATE company
        SET subscription_start = CURRENT_DATE
        WHERE subscription_start IS NULL
    """)
    op.execute("""
        UPDATE company
        SET subscription_end = CURRENT_DATE + INTERVAL '365 days'
        WHERE subscription_end IS NULL
    """)

    # Enforce NOT NULL
    op.alter_column("company", "subscription_start", nullable=False)
    op.alter_column("company", "subscription_end", nullable=False)

    # =====================================================
    # 2️⃣ USERS: COMPANY_ID NULLABLE (SUPER ADMIN SUPPORT)
    # =====================================================
    op.alter_column(
        "users",
        "company_id",
        existing_type=sa.INTEGER(),
        nullable=True,
    )

    # =====================================================
    # 3️⃣ NORMALIZE EXISTING ROLE DATA (CRITICAL)
    # =====================================================
    op.execute("""
        UPDATE users
        SET role = 'COMPANY_ADMIN'
        WHERE role = 'ADMIN'
    """)

    # =====================================================
    # 4️⃣ CREATE ENUM TYPE (POSTGRES SAFE)
    # =====================================================
    userrole_enum = sa.Enum(
        "SUPER_ADMIN",
        "COMPANY_ADMIN",
        "USER",
        name="userrole",
    )
    userrole_enum.create(op.get_bind(), checkfirst=True)

    # =====================================================
    # 5️⃣ CONVERT users.role → ENUM
    # =====================================================
    op.alter_column(
        "users",
        "role",
        existing_type=sa.VARCHAR(length=50),
        type_=userrole_enum,
        nullable=False,
        postgresql_using="role::userrole",
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.alter_column(
        "users",
        "role",
        existing_type=sa.Enum(
            "SUPER_ADMIN",
            "COMPANY_ADMIN",
            "USER",
            name="userrole",
        ),
        type_=sa.VARCHAR(length=50),
        nullable=False,
    )

    op.alter_column(
        "users",
        "company_id",
        existing_type=sa.INTEGER(),
        nullable=False,
    )

    op.drop_column("company", "is_active")
    op.drop_column("company", "subscription_end")
    op.drop_column("company", "subscription_start")
