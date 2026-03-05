"""Add collections and join table

Revision ID: 004
Revises: 003
Create Date: 2026-03-01

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create collections table with UUID
    op.create_table(
        'collections',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('color', sa.String(length=7), nullable=False, server_default='#6366f1'),
        sa.Column('icon', sa.String(length=50), nullable=True),
        sa.Column('is_system', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_collections_name', 'collections', ['name'])
    
    # Create content_collections join table with UUID
    op.create_table(
        'content_collections',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('content_id', postgresql.UUID(as_uuid=True), 
                  sa.ForeignKey('content.id', ondelete='CASCADE'), nullable=False),
        sa.Column('collection_id', postgresql.UUID(as_uuid=True), 
                  sa.ForeignKey('collections.id', ondelete='CASCADE'), nullable=False),
        sa.Column('added_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('content_id', 'collection_id', name='uq_content_collection')
    )
    op.create_index('ix_content_collections_content_id', 'content_collections', ['content_id'])
    op.create_index('ix_content_collections_collection_id', 'content_collections', ['collection_id'])


def downgrade() -> None:
    op.drop_index('ix_content_collections_collection_id', table_name='content_collections')
    op.drop_index('ix_content_collections_content_id', table_name='content_collections')
    op.drop_table('content_collections')
    op.drop_index('ix_collections_name', table_name='collections')
    op.drop_table('collections')
