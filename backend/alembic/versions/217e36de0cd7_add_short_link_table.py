"""add short_link table

Revision ID: 217e36de0cd7
Revises: 7aa9c0bffbb1
Create Date: 2026-07-20 18:25:05.187510

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '217e36de0cd7'
down_revision: Union[str, Sequence[str], None] = '7aa9c0bffbb1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'short_link',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(length=15), nullable=False),
        sa.Column('target_url', sa.Text(), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_short_link_code'), 'short_link', ['code'], unique=True)
    op.create_index(op.f('ix_short_link_id'), 'short_link', ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_short_link_id'), table_name='short_link')
    op.drop_index(op.f('ix_short_link_code'), table_name='short_link')
    op.drop_table('short_link')
