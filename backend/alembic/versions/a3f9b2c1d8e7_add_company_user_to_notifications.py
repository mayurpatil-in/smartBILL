"""add company_id and user_id to notifications

Revision ID: a3f9b2c1d8e7
Revises: 484a80e71c6d
Create Date: 2026-07-18 18:20:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3f9b2c1d8e7'
down_revision: Union[str, Sequence[str], None] = '484a80e71c6d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add company_id and user_id columns to notifications table for tenant isolation."""
    # Add company_id column (scopes notification to a company)
    op.add_column('notifications',
        sa.Column('company_id', sa.Integer(), nullable=True)
    )
    # Add user_id column (optional: scopes to a specific user)
    op.add_column('notifications',
        sa.Column('user_id', sa.Integer(), nullable=True)
    )

    # Add foreign key constraints
    op.create_foreign_key(
        'fk_notifications_company_id',
        'notifications', 'company',
        ['company_id'], ['id'],
        ondelete='CASCADE'
    )
    op.create_foreign_key(
        'fk_notifications_user_id',
        'notifications', 'users',
        ['user_id'], ['id'],
        ondelete='CASCADE'
    )

    # Index for fast per-company queries
    op.create_index(
        'ix_notifications_company_id',
        'notifications', ['company_id'],
        unique=False
    )


def downgrade() -> None:
    """Remove company_id and user_id from notifications table."""
    op.drop_index('ix_notifications_company_id', table_name='notifications')
    op.drop_constraint('fk_notifications_user_id', 'notifications', type_='foreignkey')
    op.drop_constraint('fk_notifications_company_id', 'notifications', type_='foreignkey')
    op.drop_column('notifications', 'user_id')
    op.drop_column('notifications', 'company_id')
