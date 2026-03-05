"""
Preferences model for user settings.
"""

from sqlalchemy import Column, String, Integer, Boolean, DateTime, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base import Base


class Preferences(Base):
    __tablename__ = "preferences"

    id = Column(UUID(as_uuid=True), primary_key=True)
    
    # Search defaults
    default_search_mode = Column(String(20), nullable=False, server_default='hybrid')
    
    # Library defaults
    default_library_view = Column(String(20), nullable=False, server_default='grid')
    default_sort_order = Column(String(20), nullable=False, server_default='newest')
    page_size = Column(Integer, nullable=False, server_default=20)
    
    # Enrichment
    auto_enrich = Column(Boolean, nullable=False, server_default=True)
    llm_provider = Column(String(20), nullable=False, server_default='groq')
    groq_api_key = Column(String, nullable=True)
    ollama_base_url = Column(String, nullable=False, server_default='http://localhost:11434')
    max_content_length = Column(Integer, nullable=False, server_default=10000)
    
    # Appearance
    theme = Column(String(10), nullable=False, server_default='system')
    accent_color = Column(String(10), nullable=False, server_default='#00C9A7')
    reader_font_size = Column(String(10), nullable=False, server_default='medium')
    compact_density = Column(Boolean, nullable=False, server_default=False)
    
    # Audit
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        CheckConstraint("default_search_mode IN ('keyword', 'semantic', 'hybrid')", name='ck_default_search_mode'),
        CheckConstraint("default_library_view IN ('grid', 'list', 'compact')", name='ck_default_library_view'),
        CheckConstraint("theme IN ('light', 'dark', 'system')", name='ck_theme'),
        CheckConstraint("reader_font_size IN ('small', 'medium', 'large')", name='ck_reader_font_size'),
        CheckConstraint("llm_provider IN ('groq', 'ollama')", name='ck_llm_provider'),
        CheckConstraint("page_size IN (10, 20, 50, 100)", name='ck_page_size'),
        CheckConstraint("max_content_length BETWEEN 1000 AND 50000", name='ck_max_content_length'),
    )
    
    @classmethod
    def get_or_create(cls, db):
        """Get or create the default preferences row."""
        prefs = db.query(cls).first()
        if not prefs:
            prefs = cls()
            db.add(prefs)
            db.commit()
            db.refresh(prefs)
        return prefs
