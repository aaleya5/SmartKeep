"""Create annotations table

Revision ID: annotations_v1
Revises: collections_content_v1
Create Date: 2026-03-05

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'annotations_v1'
down_revision = 'collections_content_v1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create annotations table
    op.create_table(
        'annotations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('content_id', postgresql.UUID(as_uuid=True), 
                  sa.ForeignKey('content.id', ondelete='CASCADE'), nullable=False),
        sa.Column('selected_text', sa.Text(), nullable=False),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('color', sa.Text(), nullable=False, server_default='yellow'),
        sa.Column('position_start', sa.Integer(), nullable=True),
        sa.Column('position_end', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("color IN ('yellow', 'green', 'pink', 'blue')", name='ck_annotation_color'),
    )
    
    # Create indexes
    op.create_index('idx_annotations_content_id', 'annotations', ['content_id'])
    op.create_index('idx_annotations_created_at', 'annotations', ['created_at'])


def downgrade() -> None:
    op.drop_index('idx_annotations_created_at', table_name='annotations')
    op.drop_index('idx_annotations_content_id', table_name='annotations')
    op.drop_table('annotations')
