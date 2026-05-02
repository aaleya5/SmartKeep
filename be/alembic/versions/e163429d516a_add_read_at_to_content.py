"""add_read_at_to_content

Revision ID: e163429d516a
Revises: c8f924b6e319
Create Date: 2026-05-01 23:01:47.543007

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e163429d516a'
down_revision: Union[str, Sequence[str], None] = 'c8f924b6e319'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('content', sa.Column('read_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index('idx_content_read_at', 'content', ['read_at'])
    
    # For existing data, if is_read is true, set read_at to updated_at as a fallback
    op.execute("UPDATE content SET read_at = updated_at WHERE is_read = true AND read_at IS NULL")


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('idx_content_read_at', table_name='content')
    op.drop_column('content', 'read_at')
