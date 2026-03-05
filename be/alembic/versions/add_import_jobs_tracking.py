"""Add import jobs tracking

Revision ID: 010
Revises: 009
Create Date: 2026-03-01

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '010'
down_revision = '009'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create import_jobs table for tracking bulk imports
    op.create_table(
        'import_jobs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('source_type', sa.String(20), nullable=False),  # pocket, raindrop, bookmarks
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),  # pending, processing, completed, failed
        sa.Column('total_items', sa.Integer(), nullable=True),
        sa.Column('completed_items', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('failed_items', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('errors', postgresql.JSONB(), nullable=True),  # Array of error objects
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("source_type IN ('pocket', 'raindrop', 'bookmarks')", name='ck_source_type'),
        sa.CheckConstraint("status IN ('pending', 'processing', 'completed', 'failed')", name='ck_job_status'),
    )
    
    op.create_index('idx_import_jobs_status', 'import_jobs', ['status'])
    op.create_index('idx_import_jobs_created_at', 'import_jobs', ['created_at'])


def downgrade() -> None:
    op.drop_index('idx_import_jobs_created_at', table_name='import_jobs')
    op.drop_index('idx_import_jobs_status', table_name='import_jobs')
    op.drop_table('import_jobs')
