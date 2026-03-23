"""Add pgvector extension and embedding column

Revision ID: 003
Revises: 002
Create Date: 2026-03-01

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Try to enable pgvector extension (PostgreSQL only)
    try:
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    except Exception:
        # pgvector not available - continue without it
        pass
    
    # Add embedding column as array of floats (384 dimensions for all-MiniLM-L6-v2)
    op.add_column('content', sa.Column('embedding', sa.ARRAY(sa.Float()), nullable=True))
    
    # Create index on embedding for similarity search
    # Note: Use ivfflat or hnsw after embeddings are populated
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_content_embedding_gin 
        ON content USING gin (embedding)
    """)


def downgrade() -> None:
    op.execute('DROP INDEX IF EXISTS idx_content_embedding_gin')
    op.drop_column('content', 'embedding')
    # Note: We don't drop the vector extension as it might be used elsewhere
