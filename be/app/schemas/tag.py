"""
Pydantic schemas for Tags API.
"""

from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
from enum import Enum


class TagSortEnum(str, Enum):
    count_desc = "count_desc"
    count_asc = "count_asc"
    alpha = "alpha"


class TagStatsResponse(BaseModel):
    """Response for tag statistics."""
    tag: str
    item_count: int
    last_used_at: datetime


class TagListResponse(BaseModel):
    """Response for listing tags."""
    tags: List[TagStatsResponse]


class TrendingTagResponse(BaseModel):
    """Response for trending tags."""
    tag: str
    recent_count: int
    total_count: int


class TrendingTagListResponse(BaseModel):
    """Response for listing trending tags."""
    tags: List[TrendingTagResponse]


class SuggestionResponse(BaseModel):
    """Response for tag suggestions."""
    suggestions: List[str]
