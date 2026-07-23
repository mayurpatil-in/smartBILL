"""Add hours_worked to attendance

Revision ID: 7393ccc785ba
Revises: 20d1efc03dbf
Create Date: 2026-07-23 14:56:32.414642

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7393ccc785ba'
down_revision: Union[str, Sequence[str], None] = '20d1efc03dbf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('attendance', sa.Column('hours_worked', sa.Numeric(precision=5, scale=2), nullable=True))
    op.drop_index(op.f('idx_dc_company_fy_date'), table_name='delivery_challan', if_exists=True)
    op.create_index('idx_dc_company_fy_id', 'delivery_challan', ['company_id', 'financial_year_id', 'id'], unique=False, if_not_exists=True)
    op.create_index('idx_dci_challan_id', 'delivery_challan_items', ['challan_id'], unique=False, if_not_exists=True)
    op.create_index('idx_dci_party_challan_item_id', 'delivery_challan_items', ['party_challan_item_id'], unique=False, if_not_exists=True)
    op.create_index('idx_invoice_company_fy_id', 'invoice', ['company_id', 'financial_year_id', 'id'], unique=False, if_not_exists=True)
    op.drop_index(op.f('idx_pc_company_fy_date'), table_name='party_challan', if_exists=True)
    op.drop_index(op.f('idx_pc_company_fy_status'), table_name='party_challan', if_exists=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.create_index(op.f('idx_pc_company_fy_status'), 'party_challan', ['company_id', 'financial_year_id', 'status'], unique=False, if_not_exists=True)
    op.create_index(op.f('idx_pc_company_fy_date'), 'party_challan', ['company_id', 'financial_year_id', sa.literal_column('challan_date DESC')], unique=False, if_not_exists=True)
    op.drop_index('idx_invoice_company_fy_id', table_name='invoice', if_exists=True)
    op.drop_index('idx_dci_party_challan_item_id', table_name='delivery_challan_items', if_exists=True)
    op.drop_index('idx_dci_challan_id', table_name='delivery_challan_items', if_exists=True)
    op.drop_index('idx_dc_company_fy_id', table_name='delivery_challan', if_exists=True)
    op.create_index(op.f('idx_dc_company_fy_date'), 'delivery_challan', ['company_id', 'financial_year_id', sa.literal_column('challan_date DESC')], unique=False, if_not_exists=True)
    op.drop_column('attendance', 'hours_worked')
