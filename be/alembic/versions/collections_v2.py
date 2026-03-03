# noqa: ABC123
"""Update collections for UUID support and new features

Revision ID: collections_v2
Revises: add_collections
Create Date: 2026-03-03 16:45:00.000000

This migration adds:
1. UUID support for collections (new id column, keep integer for migration)
2. New columns: icon, is_pinned, sort_order, updated_at
3. Update content_collections to support UUID references
"""

from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'collections_v2'
down_revision: Union[str, Sequence[str], None] = 'add_collections'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # type: () -> None
    """Update collections with new features and UUID support."""
    
    # Add new columns to collections table
    op.add_column('collections', sa.Column('icon', sa.String(length=50), nullable=False, server_default='📁'))
    op.add_column('collections', sa.Column('is_pinned', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('collections', sa.Column('sort_order', sa.Integer(), nullable=False, server_default=sa.text('0')))
    op.add_column('collections', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True))
    
    # Add UUID column for future migration (not populated yet)
    op.add_column('collections', sa.Column('uuid', sa.String(36), nullable=True))
    
    # Add uuid column to content_collections for UUID references
    # Note: documents table will need UUID migration first
    # For now, we'll keep integer references and add UUID columns for future use
    op.add_column('content_collections', sa.Column('content_uuid', sa.String(36), nullable=True))
    op.add_column('content_collections', sa.Column('collection_uuid', sa.String(36), nullable=True))
    
    # Create index on sort_order for ordering
    op.create_index('ix_collections_sort_order', 'collections', ['sort_order'])
    op.create_index('ix_collections_is_pinned', 'collections', ['is_pinned'])


def downgrade() -> None:
    # type: () -> None
    """Revert collections changes."""
    
    # Drop indexes
    op.drop_index('ix_collections_is_pinned', table_name='collections')
    op.drop_index('ix_collections_sort_order', table_name='collections')
    
    # Drop columns from content_collections
    op.drop_column('content_collections', 'collection_uuid')
    op.drop_column('content_collections', 'content_uuid')
    
    # Drop columns from collections
    op.drop_column('collections', 'uuid')
    op.drop_column('collections', 'updated_at')
    op.drop_column('collections', 'sort_order')
    op.drop_column('collections', 'is_pinned')
    op.drop_column('collections', 'icon')
