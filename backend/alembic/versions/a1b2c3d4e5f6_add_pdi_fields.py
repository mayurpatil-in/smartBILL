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
    # Add columns to items table (always safe)
    op.add_column('items', sa.Column('pdi_parameters', sa.JSON(), nullable=True))
    op.add_column('items', sa.Column('pdi_dimensions', sa.JSON(), nullable=True))
    op.add_column('items', sa.Column('pdi_equipment', sa.JSON(), nullable=True))

    # pdi_report was dropped in earlier migrations on a fresh DB.
    # Create it if it doesn't exist, then add the columns safely.
    conn = op.get_bind()

    # Check if pdi_report table exists
    result = conn.execute(sa.text(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
        "WHERE table_name = 'pdi_report' AND table_schema = 'public')"
    ))
    table_exists = result.scalar()

    if not table_exists:
        # Create pdi_report from scratch with all required columns
        op.create_table(
            'pdi_report',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('challan_id', sa.Integer(), nullable=False),
            sa.Column('inspection_date', sa.Date(), nullable=True),
            sa.Column('inspector_name', sa.String(length=100), nullable=True),
            sa.Column('checklist', sa.JSON(), nullable=True),
            sa.Column('parameters_data', sa.JSON(), nullable=True),
            sa.Column('dimensions_data', sa.JSON(), nullable=True),
            sa.Column('remarks', sa.Text(), nullable=True),
            sa.Column('status', sa.String(length=20), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(['challan_id'], ['delivery_challan.id'], name=op.f('pdi_report_challan_id_fkey')),
            sa.PrimaryKeyConstraint('id', name=op.f('pdi_report_pkey')),
            sa.UniqueConstraint('challan_id', name=op.f('pdi_report_challan_id_key')),
        )
        op.create_index(op.f('ix_pdi_report_id'), 'pdi_report', ['id'], unique=False)
    else:
        # Table already exists — just add the missing columns
        conn.execute(sa.text(
            "ALTER TABLE pdi_report ADD COLUMN IF NOT EXISTS parameters_data JSON"
        ))
        conn.execute(sa.text(
            "ALTER TABLE pdi_report ADD COLUMN IF NOT EXISTS dimensions_data JSON"
        ))


def downgrade() -> None:
    # Remove columns from pdi_report table
    op.drop_column('pdi_report', 'dimensions_data')
    op.drop_column('pdi_report', 'parameters_data')

    # Remove columns from items table
    op.drop_column('items', 'pdi_equipment')
    op.drop_column('items', 'pdi_dimensions')
    op.drop_column('items', 'pdi_parameters')
