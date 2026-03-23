"""Add FTS trigger and GIN index

Revision ID: 002
Revises: 001
Create Date: 2026-03-01

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add search_vector column
    op.execute("""
        ALTER TABLE content 
        ADD COLUMN IF NOT EXISTS search_vector tsvector
    """)
    
    # Create GIN index on search_vector
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_content_search_vector_gin 
        ON content USING gin (search_vector)
    """)
    
    # Create function to update search_vector
    op.execute("""
        CREATE OR REPLACE FUNCTION content_search_vector_trigger()
        RETURNS trigger AS $$
        BEGIN
            NEW.search_vector :=
                setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
                setweight(to_tsvector('english', COALESCE(NEW.summary, '')), 'B') ||
                setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'B') ||
                setweight(to_tsvector('english', COALESCE(NEW.body, '')), 'C');
            NEW.updated_at := NOW();
            RETURN NEW;
        END
        $$ LANGUAGE plpgsql
    """)
    
    # Create trigger to auto-update search_vector
    op.execute("""
        CREATE TRIGGER content_search_vector_update
        BEFORE INSERT OR UPDATE ON content
        FOR EACH ROW
        EXECUTE FUNCTION content_search_vector_trigger()
    """)
    
    # Update existing records
    op.execute("""
        UPDATE content 
        SET search_vector = 
            setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
            setweight(to_tsvector('english', COALESCE(summary, '')), 'B') ||
            setweight(to_tsvector('english', COALESCE(array_to_string(tags, ' '), '')), 'B') ||
            setweight(to_tsvector('english', COALESCE(body, '')), 'C')
        WHERE search_vector IS NULL
    """)


def downgrade() -> None:
    op.execute('DROP TRIGGER IF EXISTS content_search_vector_update ON content')
    op.execute('DROP FUNCTION IF EXISTS content_search_vector_trigger()')
    op.execute('DROP INDEX IF EXISTS idx_content_search_vector_gin')
    op.execute('ALTER TABLE content DROP COLUMN IF EXISTS search_vector')
