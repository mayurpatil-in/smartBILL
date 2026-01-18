from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

# Alembic Config
config = context.config

# Logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# 🔥 IMPORT YOUR Base + MODELS
from app.database.base import Base
from app.models import (
    company,
    user,
    financial_year,
    party,
    item,
    party_challan,  # Must be before delivery_challan
    party_challan_item,
    delivery_challan,
    delivery_challan_item,
    invoice,
    stock_transaction,
    process,
    audit_log,
    employee_profile,
    attendance,
    salary_advance,
    invoice_item,
    holiday,
    role,
)

# Metadata for autogenerate
target_metadata = Base.metadata


def get_database_url():
    from app.core.config import settings
    return settings.DATABASE_URL


def run_migrations_offline():
    url = get_database_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connectable = engine_from_config(
        {
            "sqlalchemy.url": get_database_url()
        },
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
