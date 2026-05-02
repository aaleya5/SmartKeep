from sqlalchemy import Column, String, Text, DateTime, Index, Boolean, Float, CheckConstraint, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import TSVECTOR, UUID, ARRAY
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from app.db.base import Base
import uuid

class Content(Base):
    __tablename__ = "content"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Source
    source_url = Column(Text, nullable=False)  # unique per user, enforced via UniqueConstraint below
    domain = Column(Text, nullable=True, index=True)
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
    embedding = Column(Vector(384), nullable=True)
    readability_score = Column(Float, nullable=True)
    difficulty = Column(Text, nullable=True)
    enrichment_status = Column(String(20), nullable=False, server_default='pending')
    enrichment_error = Column(Text, nullable=True)
    
    # Reading state
    reading_progress = Column(Float, nullable=False, server_default='0.0')
    is_read = Column(Boolean, nullable=False, server_default='false')
    read_at = Column(DateTime(timezone=True), nullable=True)
    last_opened_at = Column(DateTime(timezone=True), nullable=True)
    
    # Ownership
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    owner = relationship("User", back_populates="contents")

    # FTS
    search_vector = Column(TSVECTOR, nullable=True)
    
    # Audit
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        CheckConstraint('reading_progress >= 0.0 AND reading_progress <= 1.0', name='ck_reading_progress'),
        CheckConstraint("difficulty IN ('easy', 'intermediate', 'advanced')", name='ck_difficulty'),
        CheckConstraint("enrichment_status IN ('pending', 'scraping', 'enriching', 'ready', 'failed', 'processing', 'complete')", name='ck_enrichment_status'),
        Index('idx_content_created_at', 'created_at'),
        Index('idx_content_last_opened', 'last_opened_at'),
        Index('idx_content_read_at', 'read_at'),
        Index('idx_content_tags', 'tags', postgresql_using='gin'),
        Index('idx_content_search_vector_gin', 'search_vector', postgresql_using='gin'),
        Index('idx_content_embedding_hnsw', 'embedding', postgresql_using='hnsw', postgresql_with={'m': 16, 'ef_construction': 64}, postgresql_ops={'embedding': 'vector_cosine_ops'}),
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
