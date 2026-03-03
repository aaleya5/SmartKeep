from sqlalchemy import Column, Integer, String, Text, DateTime, Index, Boolean, Float
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.types import TypeDecorator, TEXT
from sqlalchemy.sql import func
from app.db.base import Base


class SearchVectorType(TypeDecorator):
    """Custom type that uses TSVECTOR for PostgreSQL and TEXT for SQLite."""
    impl = TEXT
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(TSVECTOR)
        return dialect.type_descriptor(TEXT)

    def process_result_value(self, value, dialect):
        return value

    def process_bind_param(self, value, dialect):
        return value


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    source_url = Column(String, nullable=True)
    domain = Column(String, nullable=True, index=True)
    tags = Column(String, nullable=True)  # Comma-separated tags
    is_truncated = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # PostgreSQL full-text search vector (tsvector type)
    # Uses custom type that falls back to TEXT for SQLite
    search_vector = Column(SearchVectorType, nullable=True)
    
    # ===============================
    # AI/Semantic Layer Fields
    # ===============================
    
    # Vector embedding for semantic search (384 dimensions for all-MiniLM-L6-v2)
    embedding = Column(Text, nullable=True)
    
    # Enrichment status: pending, complete, failed
    enrichment_status = Column(String(20), nullable=False, server_default='pending')
    
    # Auto-generated summary (2-3 sentences)
    summary = Column(Text, nullable=True)
    
    # AI-suggested tags (JSON array string)
    suggested_tags = Column(Text, nullable=True)
    
    # Estimated reading time in minutes (word_count / 200)
    reading_time = Column(Float, nullable=True)
    
    # Difficulty score (Flesch-Kincaid readability score)
    # Lower = more difficult, Higher = easier
    difficulty_score = Column(Float, nullable=True)

    __table_args__ = (
        # GIN index for full-text search (PostgreSQL only)
        Index('ix_documents_search_vector_gin', 'search_vector', postgresql_using='gin'),
        # Index for enrichment status filtering
        Index('ix_documents_enrichment_status', 'enrichment_status'),
    )
