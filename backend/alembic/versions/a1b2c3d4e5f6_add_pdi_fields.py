"""add pdi fields

Revision ID: a1b2c3d4e5f6
Revises: f0a68b3ba4b9
Create Date: 2026-02-13 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'f0a68b3ba4b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add columns to items table
    op.add_column('items', sa.Column('pdi_parameters', sa.JSON(), nullable=True))
    op.add_column('items', sa.Column('pdi_dimensions', sa.JSON(), nullable=True))
    op.add_column('items', sa.Column('pdi_equipment', sa.JSON(), nullable=True))

    # Add columns to pdi_report table
    op.add_column('pdi_report', sa.Column('parameters_data', sa.JSON(), nullable=True))
    op.add_column('pdi_report', sa.Column('dimensions_data', sa.JSON(), nullable=True))


def downgrade() -> None:
    # Remove columns from pdi_report table
    op.drop_column('pdi_report', 'dimensions_data')
    op.drop_column('pdi_report', 'parameters_data')

    # Remove columns from items table
    op.drop_column('items', 'pdi_equipment')
    op.drop_column('items', 'pdi_dimensions')
    op.drop_column('items', 'pdi_parameters')
