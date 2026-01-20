"""add_rate_to_delivery_challan_items

Revision ID: ec51490ef2b8
Revises: f50f947243e5
Create Date: 2026-01-20 11:14:16.935341

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ec51490ef2b8'
down_revision: Union[str, Sequence[str], None] = 'f50f947243e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('delivery_challan_items', sa.Column('rate', sa.Numeric(10, 2), nullable=False, server_default='0'))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('delivery_challan_items', 'rate')
