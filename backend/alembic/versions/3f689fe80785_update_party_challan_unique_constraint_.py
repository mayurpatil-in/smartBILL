"""Update party challan unique constraint to include party

Revision ID: 3f689fe80785
Revises: 5cb4a0e85646
Create Date: 2025-12-29 21:16:01.314370

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3f689fe80785'
down_revision: Union[str, Sequence[str], None] = '5cb4a0e85646'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Drop the old unique constraint (challan_number, company_id, financial_year_id)
    op.drop_constraint('uq_party_challan_number_fy', 'party_challan', type_='unique')
    
    # Create new composite unique constraint including party_id
    op.create_unique_constraint(
        'uq_party_challan_number_party_fy',
        'party_challan',
        ['challan_number', 'party_id', 'company_id', 'financial_year_id']
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Drop the new constraint
    op.drop_constraint('uq_party_challan_number_party_fy', 'party_challan', type_='unique')
    
    # Recreate the old constraint without party_id
    op.create_unique_constraint(
        'uq_party_challan_number_fy',
        'party_challan',
        ['challan_number', 'company_id', 'financial_year_id']
    )
