from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from uuid import UUID
from enum import Enum


class SearchModeEnum(str, Enum):
    keyword = "keyword"
    semantic = "semantic"
    hybrid = "hybrid"


class SearchRequest(BaseModel):
    query: str
    mode: str = "hybrid"  # keyword | semantic | hybrid
    tags: List[str] = []
    domain: Optional[str] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    difficulty: Optional[str] = None
    collection_id: Optional[UUID] = None
    limit: int = 20
    offset: int = 0


class SearchResultItem(BaseModel):
    # All fields from ContentResponse, plus:
    id: UUID
    source_url: str
    domain: str
    og_image_url: Optional[str] = None
    favicon_url: Optional[str] = None
    title: str
    author: Optional[str] = None
    summary: Optional[str] = None
    suggested_tags: List[str] = []
    tags: List[str] = []
    notes: Optional[str] = None
    word_count: Optional[int] = None
    reading_time_minutes: int = 0
    difficulty: Optional[str] = None
    readability_score: Optional[float] = None
    is_truncated: bool = False
    is_read: bool = False
    reading_progress: float = 0.0
    enrichment_status: str = "pending"
    published_at: Optional[datetime] = None
    last_opened_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    # Search-specific fields
    relevance_score: Optional[float] = None    # ts_rank for keyword
    similarity_score: Optional[float] = None   # cosine similarity for semantic
    combined_score: Optional[float] = None    # weighted score for hybrid
    matched_excerpt: Optional[str] = None     # snippet with highlighted terms (HTML-safe)


class SearchResponse(BaseModel):
    items: List[SearchResultItem]
    total: int
    query: str
    mode: str
    latency_ms: int
    filters_applied: Dict[str, Any]


class SuggestionResponse(BaseModel):
    suggestions: List[str]


class SearchHistoryItem(BaseModel):
    query: str
    mode: str
    searched_at: datetime
    
    class Config:
        from_attributes = True


class SearchHistoryResponse(BaseModel):
    history: List[SearchHistoryItem]


class SavedSearchCreate(BaseModel):
    name: str
    query: str
    mode: str = "hybrid"
    filters: Dict[str, Any] = {}


class SavedSearchResponse(BaseModel):
    id: UUID
    name: str
    query: str
    mode: str
    filters: Dict[str, Any]
    created_at: datetime
    
    class Config:
        from_attributes = True


class SavedSearchesResponse(BaseModel):
    saved_searches: List[SavedSearchResponse]
