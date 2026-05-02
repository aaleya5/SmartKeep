"""enable_pgvector_and_hnsw

Revision ID: ed07b3c61389
Revises: d9606e7e989a
Create Date: 2026-05-01 22:21:47.820163

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ed07b3c61389'
down_revision: Union[str, Sequence[str], None] = 'd9606e7e989a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Enable pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    
    # Drop the old GIN index FIRST (it's incompatible with the vector type)
    op.execute("DROP INDEX IF EXISTS idx_content_embedding_gin")

    # Convert embedding column from ARRAY(Float) to vector(384)
    op.execute("ALTER TABLE content ALTER COLUMN embedding TYPE vector(384) USING embedding::vector(384)")
    
    # Create high-performance HNSW index for cosine similarity
    op.execute("CREATE INDEX idx_content_embedding_hnsw ON content USING hnsw (embedding vector_cosine_ops)")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP INDEX IF EXISTS idx_content_embedding_hnsw")
    # Revert to ARRAY(Float)
    op.execute("ALTER TABLE content ALTER COLUMN embedding TYPE float8[] USING embedding::float8[]")
    # Recreate the (less efficient) GIN index
    op.execute("CREATE INDEX idx_content_embedding_gin ON content USING gin (embedding)")
