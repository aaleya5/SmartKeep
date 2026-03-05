"""Add additional indexes for performance

Revision ID: 009
Revises: 008
Create Date: 2026-03-01

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = '009'
down_revision = '008'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add index on enrichment_status for filtering
    op.create_index('idx_content_enrichment_status', 'content', ['enrichment_status'])
    
    # Add index on is_read for filtering
    op.create_index('idx_content_is_read', 'content', ['is_read'])
    
    # Add composite index for common queries
    op.create_index('idx_content_created_is_read', 'content', ['created_at', 'is_read'])
    
    # Add index on difficulty
    op.create_index('idx_content_difficulty', 'content', ['difficulty'])
    
    # Add index on reading_progress
    op.create_index('idx_content_reading_progress', 'content', ['reading_progress'])


def downgrade() -> None:
    op.drop_index('idx_content_reading_progress', table_name='content')
    op.drop_index('idx_content_difficulty', table_name='content')
    op.drop_index('idx_content_created_is_read', table_name='content')
    op.drop_index('idx_content_is_read', table_name='content')
    op.drop_index('idx_content_enrichment_status', table_name='content')
