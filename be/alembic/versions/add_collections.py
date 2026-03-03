# noqa: ABC123
"""Add collections and content_collections tables

Revision ID: add_collections
Revises: add_pgvector_ai
Create Date: 2026-03-03 12:30:00.000000

This migration adds:
1. collections table - for user-created collections/spaces
2. content_collections join table - many-to-many relationship
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_collections'
down_revision: Union[str, Sequence[str], None] = 'add_pgvector_ai'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # type: () -> None
    """Create collections and content_collections tables."""
    
    # Create collections table
    op.create_table(
        'collections',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('color', sa.String(length=7), nullable=False, server_default='#6366f1'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),  # Reserved for future auth
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_collections_id', 'collections', ['id'])
    op.create_index('ix_collections_name', 'collections', ['name'])
    
    # Create content_collections join table (many-to-many)
    op.create_table(
        'content_collections',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('document_id', sa.Integer(), nullable=False),
        sa.Column('collection_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['collection_id'], ['collections.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('document_id', 'collection_id', name='uq_document_collection')
    )
    op.create_index('ix_content_collections_id', 'content_collections', ['id'])
    op.create_index('ix_content_collections_document_id', 'content_collections', ['document_id'])
    op.create_index('ix_content_collections_collection_id', 'content_collections', ['collection_id'])


def downgrade() -> None:
    # type: () -> None
    """Drop collections and content_collections tables."""
    
    # Drop indexes
    op.drop_index('ix_content_collections_collection_id', table_name='content_collections')
    op.drop_index('ix_content_collections_document_id', table_name='content_collections')
    op.drop_index('ix_content_collections_id', table_name='content_collections')
    op.drop_index('ix_collections_name', table_name='collections')
    op.drop_index('ix_collections_id', table_name='collections')
    
    # Drop tables
    op.drop_table('content_collections')
    op.drop_table('collections')
