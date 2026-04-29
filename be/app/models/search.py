from sqlalchemy import Column, String, Text, DateTime, Integer, CheckConstraint, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from app.db.base import Base


import uuid

class SearchHistory(Base):
    __tablename__ = "search_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    query = Column(Text, nullable=False)
    mode = Column(Text, nullable=False)  # keyword, semantic, hybrid
    result_count = Column(Integer, nullable=True)
    searched_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    
    __table_args__ = (
        CheckConstraint("mode IN ('keyword', 'semantic', 'hybrid')", name='ck_search_history_mode'),
        Index('idx_search_history_searched_at', 'searched_at'),
    )


class SavedSearch(Base):
    __tablename__ = "saved_searches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False)
    query = Column(Text, nullable=False)
    mode = Column(Text, nullable=False, server_default='hybrid')
    filters = Column(JSONB, nullable=False, server_default='{}')
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    
    __table_args__ = (
        CheckConstraint("mode IN ('keyword', 'semantic', 'hybrid')", name='ck_saved_searches_mode'),
    )
