"""fix_missing_qty_columns

Revision ID: a0d7eb1fc6df
Revises: 04bbde8045da
Create Date: 2026-01-10 14:05:34.676421

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a0d7eb1fc6df'
down_revision: Union[str, Sequence[str], None] = '04bbde8045da'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('invoice_items', sa.Column('ok_qty', sa.Numeric(10, 2), nullable=True))
    op.add_column('invoice_items', sa.Column('cr_qty', sa.Numeric(10, 2), nullable=True))
    op.add_column('invoice_items', sa.Column('mr_qty', sa.Numeric(10, 2), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('invoice_items', 'mr_qty')
    op.drop_column('invoice_items', 'cr_qty')
    op.drop_column('invoice_items', 'ok_qty')
