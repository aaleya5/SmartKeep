"""Create tag_stats materialized view

Revision ID: tag_stats_v1
Revises: annotations_v1
Create Date: 2026-03-05

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'tag_stats_v1'
down_revision = 'annotations_v1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create materialized view for tag statistics
    op.execute("""
        CREATE MATERIALIZED VIEW tag_stats AS
        SELECT
            tag,
            COUNT(*)                        AS item_count,
            MAX(c.created_at)               AS last_used_at
        FROM content c, unnest(c.tags) AS tag
        GROUP BY tag
    """)
    
    # Create unique index on tag
    op.execute("""
        CREATE UNIQUE INDEX idx_tag_stats_tag ON tag_stats (tag)
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_tag_stats_tag")
    op.execute("DROP MATERIALIZED VIEW IF EXISTS tag_stats")
