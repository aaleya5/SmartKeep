"""
Collection and ContentCollection models for organizing content.

This module defines:
- Collection: User-created collections/spaces
- ContentCollection: Many-to-many relationship between content and collections
"""

import uuid
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint, Index, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base
from sqlalchemy.dialects.postgresql import UUID


class ContentCollection(Base):
    """Join table for many-to-many relationship between content and collections."""
    
    __tablename__ = "content_collections"
    
    content_id = Column(UUID(as_uuid=True), ForeignKey("content.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    collection_id = Column(UUID(as_uuid=True), ForeignKey("collections.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    added_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    collection = relationship("Collection", back_populates="content_collections")
    content = relationship("Content", back_populates="collections")
    
    __table_args__ = (
        Index('idx_cc_collection_id', 'collection_id'),
        Index('idx_cc_content_id', 'content_id'),
    )


class Collection(Base):
    """User-created collection/space for organizing content."""
    
    __tablename__ = "collections"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String(7), nullable=False, default="#1A3A5C")
    icon = Column(String(50), nullable=False, default="📁")
    is_pinned = Column(Boolean, nullable=False, server_default='false')
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationship to content_collections (join table)
    content_collections = relationship("ContentCollection", back_populates="collection", cascade="all, delete-orphan")
    
    @property
    def item_count(self) -> int:
        """Get the number of content items in this collection."""
        return len(self.content_collections) if self.content_collections else 0
