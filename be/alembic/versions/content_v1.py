"""Create content table

Revision ID: content_v1
Revises: 
Create Date: 2026-03-04

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'content_v1'
down_revision = None  # Set to latest migration
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create content table
    op.create_table(
        'content',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        
        # Source
        sa.Column('source_url', sa.Text(), nullable=False, unique=True),
        sa.Column('domain', sa.Text(), nullable=False),
        sa.Column('og_image_url', sa.Text(), nullable=True),
        sa.Column('favicon_url', sa.Text(), nullable=True),
        
        # Scraped content
        sa.Column('title', sa.Text(), nullable=False),
        sa.Column('author', sa.Text(), nullable=True),
        sa.Column('body', sa.Text(), nullable=True),
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('word_count', sa.Integer(), nullable=True),  # Generated column
        sa.Column('is_truncated', sa.Boolean(), nullable=False, server_default='false'),
        
        # User-assigned metadata
        sa.Column('tags', postgresql.ARRAY(sa.Text()), nullable=False, server_default='{}'),
        sa.Column('notes', sa.Text(), nullable=True),
        
        # AI enrichment
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('suggested_tags', postgresql.ARRAY(sa.Text()), nullable=False, server_default='{}'),
        sa.Column('embedding', postgresql.JSONB(), nullable=True),  # pgvector as JSON for compatibility
        sa.Column('readability_score', sa.Float(), nullable=True),
        sa.Column('difficulty', sa.Text(), nullable=True),  # CHECK constraint in table args
        sa.Column('enrichment_status', sa.Text(), nullable=False, server_default='pending'),
        sa.Column('enrichment_error', sa.Text(), nullable=True),
        
        # Reading state
        sa.Column('reading_progress', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('last_opened_at', sa.DateTime(timezone=True), nullable=True),
        
        # FTS
        sa.Column('search_vector', postgresql.TSVECTOR(), nullable=True),
        
        # Audit
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        
        # Table constraints
        sa.CheckConstraint('reading_progress >= 0.0 AND reading_progress <= 1.0', name='ck_reading_progress'),
        sa.CheckConstraint("difficulty IN ('easy', 'intermediate', 'advanced')", name='ck_difficulty'),
        sa.CheckConstraint("enrichment_status IN ('pending', 'processing', 'complete', 'failed')", name='ck_enrichment_status'),
    )
    
    # Create indexes
    op.create_index('idx_content_domain', 'content', ['domain'])
    op.create_index('idx_content_created_at', 'content', ['created_at'])
    op.create_index('idx_content_last_opened', 'content', ['last_opened_at'])
    op.create_index('idx_content_tags', 'content', ['tags'], postgresql_using='gin')
    op.create_index('idx_content_search_vector', 'content', ['search_vector'], postgresql_using='gin')
    op.create_index('idx_content_embedding', 'content', ['embedding'], postgresql_using='gin')
    
    # Create trigger function for auto-updating search_vector
    op.execute("""
        CREATE OR REPLACE FUNCTION update_search_vector()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.search_vector :=
                setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
                setweight(to_tsvector('english', coalesce(NEW.summary, '')), 'B') ||
                setweight(to_tsvector('english', coalesce(array_to_string(NEW.tags, ' '), '')), 'B') ||
                setweight(to_tsvector('english', coalesce(NEW.body, '')), 'C');
            NEW.updated_at := NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    
    # Create trigger
    op.execute("""
        CREATE TRIGGER trg_content_search_vector
            BEFORE INSERT OR UPDATE ON content
            FOR EACH ROW EXECUTE FUNCTION update_search_vector();
    """)


def downgrade() -> None:
    op.execute('DROP TRIGGER IF EXISTS trg_content_search_vector ON content')
    op.execute('DROP FUNCTION IF EXISTS update_search_vector()')
    op.drop_index('idx_content_embedding', table_name='content')
    op.drop_index('idx_content_search_vector', table_name='content')
    op.drop_index('idx_content_tags', table_name='content')
    op.drop_index('idx_content_last_opened', table_name='content')
    op.drop_index('idx_content_created_at', table_name='content')
    op.drop_index('idx_content_domain', table_name='content')
    op.drop_table('content')
