"""Add quality tracking to delivery challan

Revision ID: 90d83104db79
Revises: 3f689fe80785
Create Date: 2025-12-30 10:39:14.178040

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '90d83104db79'
down_revision: Union[str, Sequence[str], None] = '3f689fe80785'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add vehicle_number to delivery_challan
    op.add_column('delivery_challan', 
        sa.Column('vehicle_number', sa.String(50), nullable=True)
    )
    
    # Add quality tracking fields to delivery_challan_items
    op.add_column('delivery_challan_items',
        sa.Column('ok_qty', sa.Numeric(10, 2), nullable=False, server_default='0')
    )
    op.add_column('delivery_challan_items',
        sa.Column('cr_qty', sa.Numeric(10, 2), nullable=False, server_default='0')
    )
    op.add_column('delivery_challan_items',
        sa.Column('mr_qty', sa.Numeric(10, 2), nullable=False, server_default='0')
    )
    # Note: party_challan_item_id already exists, no need to add


def downgrade() -> None:
    """Downgrade schema."""
    # Drop columns from delivery_challan_items
    op.drop_column('delivery_challan_items', 'mr_qty')
    op.drop_column('delivery_challan_items', 'cr_qty')
    op.drop_column('delivery_challan_items', 'ok_qty')
    
    # Drop column from delivery_challan
    op.drop_column('delivery_challan', 'vehicle_number')
