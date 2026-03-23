"""
Pydantic schemas for Dashboard API.
"""

from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

# Import response schemas from other modules
from app.schemas.content import ContentResponse
from app.schemas.collection import CollectionResponse


class SavesPerDay(BaseModel):
    """Daily save count for chart."""
    date: str
    count: int


class TrendingTag(BaseModel):
    """Trending tag info."""
    tag: str
    recent_count: int
    total_count: int


class DashboardResponse(BaseModel):
    """Complete dashboard response."""
    recent_saves: List[ContentResponse]
    continue_reading: List[ContentResponse]
    collections_preview: List[CollectionResponse]
    trending_tags: List[TrendingTag]
    saves_this_week: List[SavesPerDay]
    suggested_rereads: List[ContentResponse]
    total_items: int
    total_reading_hours: float
    total_annotations: int
