"""
Annotation model for storing user annotations/highlights on content.
"""

from sqlalchemy import Column, String, Text, DateTime, Integer, ForeignKey, CheckConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base


class Annotation(Base):
    """User annotation on content."""
    
    __tablename__ = "annotations"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    content_id = Column(UUID(as_uuid=True), ForeignKey("content.id", ondelete="CASCADE"), nullable=False)
    selected_text = Column(Text, nullable=False)
    note = Column(Text, nullable=True)
    color = Column(String(20), nullable=False, default="yellow")
    position_start = Column(Integer, nullable=True)
    position_end = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    
    # Relationship to content
    content = relationship("Content", back_populates="annotations")
    
    __table_args__ = (
        CheckConstraint("color IN ('yellow', 'green', 'pink', 'blue')", name='ck_annotation_color'),
        Index('idx_annotations_content_id', 'content_id'),
        Index('idx_annotations_created_at', 'created_at'),
    )
