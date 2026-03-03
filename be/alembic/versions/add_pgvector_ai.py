# noqa: ABC123
"""Add pgvector extension and AI/embedding columns

Revision ID: add_pgvector_ai
Revises: add_truncated
Create Date: 2026-03-03 12:00:00.000000

This migration adds:
1. pgvector extension for semantic search
2. embedding column (vector(384)) for document embeddings
3. enrichment_status column for tracking AI enrichment state
4. summary column for auto-generated summaries
5. suggested_tags column for AI-suggested tags
6. reading_time column for estimated reading time
7. difficulty_score column for readability scoring
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_pgvector_ai'
down_revision: Union[str, Sequence[str], None] = 'add_truncated'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # type: () -> None
    """Add pgvector extension and AI-related columns."""
    
    # Enable pgvector extension (PostgreSQL only)
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    
    # Add embedding column with vector type (384 dimensions for all-MiniLM-L6-v2)
    # Using text type as fallback for SQLAlchemy compatibility
    op.add_column('documents', sa.Column('embedding', sa.Text(), nullable=True))
    
    # Add enrichment status column (pending, complete, failed)
    op.add_column('documents', sa.Column(
        'enrichment_status', 
        sa.String(20), 
        nullable=False, 
        server_default='pending'
    ))
    
    # Add summary column for auto-generated summaries
    op.add_column('documents', sa.Column('summary', sa.Text(), nullable=True))
    
    # Add suggested_tags column for AI-suggested tags (JSON array)
    op.add_column('documents', sa.Column('suggested_tags', sa.Text(), nullable=True))
    
    # Add reading_time column (in minutes)
    op.add_column('documents', sa.Column('reading_time', sa.Float(), nullable=True))
    
    # Add difficulty_score column (Flesch-Kincaid readability score)
    op.add_column('documents', sa.Column('difficulty_score', sa.Float(), nullable=True))
    
    # Create index on enrichment_status for filtering
    op.create_index('ix_documents_enrichment_status', 'documents', ['enrichment_status'], unique=False)
    
    # Note: Vector index (IVFFlat or HNSW) will be created after embeddings are populated
    # This is done separately to avoid issues with empty vectors


def downgrade() -> None:
    # type: () -> None
    """Remove AI-related columns and pgvector extension."""
    
    # Drop indexes
    op.drop_index('ix_documents_enrichment_status', table_name='documents')
    
    # Drop columns
    op.drop_column('documents', 'difficulty_score')
    op.drop_column('documents', 'reading_time')
    op.drop_column('documents', 'suggested_tags')
    op.drop_column('documents', 'summary')
    op.drop_column('documents', 'enrichment_status')
    op.drop_column('documents', 'embedding')
    
    # Note: We don't drop the vector extension as it might be used by other tables
