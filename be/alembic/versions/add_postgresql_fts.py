# noqa: ABC123
"""Add PostgreSQL full-text search

Revision ID: add_fts
Revises: abc123
Create Date: 2026-03-02 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_fts'
down_revision: Union[str, Sequence[str], None] = 'abc123'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # type: () -> None
    """Add PostgreSQL full-text search column, GIN index, and trigger."""
    
    # Add search_vector column as TSVECTOR type (if it doesn't exist)
    op.execute("""
        ALTER TABLE documents 
        ADD COLUMN IF NOT EXISTS search_vector tsvector
    """)
    
    # Create GIN index on search_vector (tsvector has built-in support for GIN)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_documents_search_vector_gin 
        ON documents USING gin (search_vector)
    """)
    
    # Create function to update search_vector
    op.execute("""
        CREATE OR REPLACE FUNCTION documents_search_vector_trigger()
        RETURNS trigger AS $$
        BEGIN
            NEW.search_vector :=
                setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
                setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B') ||
                setweight(to_tsvector('english', COALESCE(NEW.tags, '')), 'C');
            RETURN NEW;
        END
        $$ LANGUAGE plpgsql
    """)
    
    # Create trigger to auto-update search_vector on insert/update
    op.execute("""
        DROP TRIGGER IF EXISTS documents_search_vector_update ON documents
    """)
    
    op.execute("""
        CREATE TRIGGER documents_search_vector_update
        BEFORE INSERT OR UPDATE ON documents
        FOR EACH ROW
        EXECUTE FUNCTION documents_search_vector_trigger()
    """)
    
    # Update existing records
    op.execute("""
        UPDATE documents 
        SET search_vector = 
            setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
            setweight(to_tsvector('english', COALESCE(content, '')), 'B') ||
            setweight(to_tsvector('english', COALESCE(tags, '')), 'C')
        WHERE search_vector IS NULL
    """)


def downgrade() -> None:
    # type: () -> None
    """Remove PostgreSQL full-text search."""
    
    # Drop trigger
    op.execute("DROP TRIGGER IF EXISTS documents_search_vector_update ON documents")
    
    # Drop function
    op.execute("DROP FUNCTION IF EXISTS documents_search_vector_trigger()")
    
    # Drop index
    op.execute("DROP INDEX IF EXISTS ix_documents_search_vector_gin")
    
    # Drop column
    op.execute("ALTER TABLE documents DROP COLUMN IF EXISTS search_vector")
