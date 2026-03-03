from sqlalchemy import Column, Integer, String, Text, DateTime, Index, Boolean
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

    __table_args__ = (
        # GIN index for full-text search (PostgreSQL only)
        Index('ix_documents_search_vector_gin', 'search_vector', postgresql_using='gin'),
    )
