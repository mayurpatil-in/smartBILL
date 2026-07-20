"""add updated_at to short_link

Revision ID: 515fa6dfee3c
Revises: 217e36de0cd7
Create Date: 2026-07-20 19:27:53.856698

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '515fa6dfee3c'
down_revision: Union[str, Sequence[str], None] = '217e36de0cd7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('short_link', sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('short_link', 'updated_at')
