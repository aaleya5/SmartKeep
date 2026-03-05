"""Add search history and saved searches

Revision ID: 006
Revises: 005
Create Date: 2026-03-01

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create search_history table
    op.create_table(
        'search_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('query', sa.Text(), nullable=False),
        sa.Column('mode', sa.String(length=20), nullable=False),
        sa.Column('result_count', sa.Integer(), nullable=True),
        sa.Column('searched_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("mode IN ('keyword', 'semantic', 'hybrid')", name='ck_search_history_mode'),
    )
    
    op.create_index('idx_search_history_searched_at', 'search_history', ['searched_at'])
    
    # Create saved_searches table
    op.create_table(
        'saved_searches',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('query', sa.Text(), nullable=False),
        sa.Column('mode', sa.String(length=20), nullable=False, server_default='hybrid'),
        sa.Column('filters', postgresql.JSONB(), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("mode IN ('keyword', 'semantic', 'hybrid')", name='ck_saved_searches_mode'),
    )


def downgrade() -> None:
    op.drop_table('saved_searches')
    op.drop_index('idx_search_history_searched_at', table_name='search_history')
    op.drop_table('search_history')
