"""Update party challan unique constraint to include financial year

Revision ID: 5cb4a0e85646
Revises: 8d663c9604de
Create Date: 2025-12-29 21:09:47.856068

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5cb4a0e85646'
down_revision: Union[str, Sequence[str], None] = '8d663c9604de'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop the old unique constraint on challan_number only
    op.drop_index('ix_party_challan_challan_number', table_name='party_challan')
    
    # Create new composite unique constraint for challan_number per financial year
    op.create_unique_constraint(
        'uq_party_challan_number_fy',
        'party_challan',
        ['challan_number', 'company_id', 'financial_year_id']
    )
    
    # Recreate the index for searching (non-unique)
    op.create_index('ix_party_challan_challan_number', 'party_challan', ['challan_number'], unique=False)


def downgrade() -> None:
    # Drop the composite unique constraint
    op.drop_constraint('uq_party_challan_number_fy', 'party_challan', type_='unique')
    
    # Drop the non-unique index
    op.drop_index('ix_party_challan_challan_number', table_name='party_challan')
    
    # Recreate the old unique index
    op.create_index('ix_party_challan_challan_number', 'party_challan', ['challan_number'], unique=True)
