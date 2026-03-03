# noqa: ABC123
"""Add is_truncated column

Revision ID: add_truncated
Revises: add_fts
Create Date: 2026-03-02 18:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_truncated'
down_revision: Union[str, Sequence[str], None] = 'add_fts'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # type: () -> None
    """Add is_truncated column to documents table."""
    op.add_column('documents', sa.Column('is_truncated', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    # type: () -> None
    """Remove is_truncated column."""
    op.drop_column('documents', 'is_truncated')
