"""
Collection and ContentCollection models for organizing documents.

This module defines:
- Collection: User-created collections/spaces
- ContentCollection: Many-to-many relationship between documents and collections
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint, Index, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class ContentCollection(Base):
    """Join table for many-to-many relationship between documents and collections."""
    
    __tablename__ = "content_collections"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    collection_id = Column(Integer, ForeignKey("collections.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships - back_populates defined here to avoid circular import issues
    collection = relationship("Collection", back_populates="content_collections")
    document = relationship("Document", back_populates="content_collections")
    
    __table_args__ = (
        # Unique constraint to prevent duplicate entries
        UniqueConstraint('document_id', 'collection_id', name='uq_document_collection'),
        # Indexes for faster queries
        Index('ix_content_collections_document_id', 'document_id'),
        Index('ix_content_collections_collection_id', 'collection_id'),
    )


class Collection(Base):
    """User-created collection/space for organizing documents."""
    
    __tablename__ = "collections"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String(7), nullable=False, default="#6366f1")  # Hex color
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user_id = Column(Integer, nullable=True)  # Reserved for future auth
    
    # Relationship to content_collections (join table)
    content_collections = relationship("ContentCollection", back_populates="collection", cascade="all, delete-orphan")
    
    @property
    def document_count(self) -> int:
        """Get the number of documents in this collection."""
        return len(self.content_collections) if self.content_collections else 0
