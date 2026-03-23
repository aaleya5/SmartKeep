from sqlalchemy import Column, String, Text, DateTime, Index, Boolean, Float, CheckConstraint, Integer
from sqlalchemy.dialects.postgresql import TSVECTOR, UUID, ARRAY
from sqlalchemy.types import TypeDecorator, TEXT
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base


class VectorType(TypeDecorator):
    """Custom type that uses JSONB for pgvector storage."""
    impl = TEXT
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(ARRAY(Float))
        return dialect.type_descriptor(TEXT)

    def process_result_value(self, value, dialect):
        return value

    def process_bind_param(self, value, dialect):
        return value


class Content(Base):
    __tablename__ = "content"

    id = Column(UUID(as_uuid=True), primary_key=True)
    
    # Source
    source_url = Column(Text, nullable=False, unique=True)
    domain = Column(Text, nullable=False, index=True)
    og_image_url = Column(Text, nullable=True)
    favicon_url = Column(Text, nullable=True)
    
    # Scraped content
    title = Column(Text, nullable=False)
    author = Column(Text, nullable=True)
    body = Column(Text, nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    word_count = Column(Integer, nullable=True)
    is_truncated = Column(Boolean, nullable=False, server_default='false')
    
    # User-assigned metadata
    tags = Column(ARRAY(Text), nullable=False, server_default='{}')
    notes = Column(Text, nullable=True)
    
    # AI enrichment
    summary = Column(Text, nullable=True)
    suggested_tags = Column(ARRAY(Text), nullable=False, server_default='{}')
    embedding = Column(ARRAY(Float), nullable=True)
    readability_score = Column(Float, nullable=True)
    difficulty = Column(Text, nullable=True)
    enrichment_status = Column(String(20), nullable=False, server_default='pending')
    enrichment_error = Column(Text, nullable=True)
    
    # Reading state
    reading_progress = Column(Float, nullable=False, server_default='0.0')
    is_read = Column(Boolean, nullable=False, server_default='false')
    last_opened_at = Column(DateTime(timezone=True), nullable=True)
    
    # FTS
    search_vector = Column(TSVECTOR, nullable=True)
    
    # Audit
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        CheckConstraint('reading_progress >= 0.0 AND reading_progress <= 1.0', name='ck_reading_progress'),
        CheckConstraint("difficulty IN ('easy', 'intermediate', 'advanced')", name='ck_difficulty'),
        CheckConstraint("enrichment_status IN ('pending', 'processing', 'complete', 'failed')", name='ck_enrichment_status'),
        Index('idx_content_created_at', 'created_at'),
        Index('idx_content_last_opened', 'last_opened_at'),
        Index('idx_content_tags', 'tags', postgresql_using='gin'),
        Index('idx_content_search_vector', 'search_vector', postgresql_using='gin'),
        Index('idx_content_embedding', 'embedding', postgresql_using='gin'),
    )
    
    @property
    def reading_time_minutes(self) -> int:
        """Calculate reading time in minutes (word_count / 200, rounded up)."""
        if self.word_count is None:
            return 0
        return (self.word_count + 199) // 200  # Round up
    
    def calculate_word_count(self) -> int:
        """Calculate word count from body."""
        if not self.body:
            return 0
        return len(self.body.split())
    
    # Relationship to collections (join table)
    collections = relationship(
        "ContentCollection",
        back_populates="content",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )
    
    # Relationship to annotations
    annotations = relationship(
        "Annotation",
        back_populates="content",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )
