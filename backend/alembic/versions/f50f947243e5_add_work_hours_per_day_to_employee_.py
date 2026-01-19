"""add work_hours_per_day to employee_profile

Revision ID: f50f947243e5
Revises: 590f0e754be6
Create Date: 2026-01-18 22:36:33.325493

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f50f947243e5'
down_revision: Union[str, Sequence[str], None] = '590f0e754be6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("employee_profiles", sa.Column("work_hours_per_day", sa.Integer(), nullable=True, server_default="8"))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("employee_profiles", "work_hours_per_day")
