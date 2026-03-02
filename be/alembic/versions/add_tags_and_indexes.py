# noqa: ABC123
"""Add tags column and indexes

Revision ID: abc123
Revises: dd54de22de93
Create Date: 2026-03-01 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'abc123'
down_revision: Union[str, Sequence[str], None] = 'dd54de22de93'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # type: () -> None
    """Add tags column and performance indexes."""
    # Add tags column
    op.add_column('documents', sa.Column('tags', sa.String(), nullable=True))
    
    # Add index on domain for faster lookups
    op.create_index('ix_documents_domain', 'documents', ['domain'], unique=False)
    
    # Add index on created_at for sorting/filtering
    op.create_index('ix_documents_created_at', 'documents', ['created_at'], unique=False)
    
    # Add index on source_url for duplicate detection
    op.create_index('ix_documents_source_url', 'documents', ['source_url'], unique=False)


def downgrade() -> None:
    # type: () -> None
    """Remove tags column and indexes."""
    op.drop_index('ix_documents_source_url', table_name='documents')
    op.drop_index('ix_documents_created_at', table_name='documents')
    op.drop_index('ix_documents_domain', table_name='documents')
    op.drop_column('documents', 'tags')
