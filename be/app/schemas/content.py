from pydantic import BaseModel, HttpUrl, field_validator, ConfigDict, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from enum import Enum


class SortEnum(str, Enum):
    newest = "newest"
    oldest = "oldest"
    last_opened = "last_opened"
    reading_time_asc = "reading_time_asc"
    reading_time_desc = "reading_time_desc"
    alpha_asc = "alpha_asc"
    alpha_desc = "alpha_desc"
    date_read = "date_read"


class DifficultyEnum(str, Enum):
    easy = "easy"
    intermediate = "intermediate"
    advanced = "advanced"


class EnrichmentStatusEnum(str, Enum):
    pending = "pending"
    scraping = "scraping"
    enriching = "enriching"
    ready = "ready"
    failed = "failed"


class ContentCreate(BaseModel):
    url: HttpUrl


class ContentManualCreate(BaseModel):
    title: str
    body: Optional[str] = None
    content: Optional[str] = None  # alias for body (frontend sends 'content')
    source_url: Optional[HttpUrl] = None
    tags: List[str] = []
    notes: Optional[str] = None

    @field_validator('body', mode='before')
    @classmethod
    def body_from_content(cls, v, info):
        # Allow 'content' field as alias for 'body'
        if v is None and hasattr(info, 'data') and info.data.get('content'):
            return info.data['content']
        return v


class ContentUpdate(BaseModel):
    title: Optional[str] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    is_read: Optional[bool] = None
    reading_progress: Optional[float] = None


class ContentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    source_url: str
    domain: Optional[str] = None
    og_image_url: Optional[str] = None
    favicon_url: Optional[str] = None
    title: str
    author: Optional[str] = None
    summary: Optional[str] = None
    suggested_tags: List[str] = []
    tags: List[str] = []
    notes: Optional[str] = None
    word_count: Optional[int] = None
    reading_time_minutes: int = 0  # computed: word_count / 200, rounded up
    difficulty: Optional[str] = None
    readability_score: Optional[float] = None
    is_truncated: bool = False
    is_read: bool = False
    reading_progress: float = 0.0
    enrichment_status: str = "pending"
    published_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    last_opened_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    @field_validator('reading_time_minutes', mode='before')
    @classmethod
    def compute_reading_time(cls, v, info):
        if v is not None:
            return v
        # Calculate from word_count
        data = info.data
        if data.get('word_count'):
            return (data['word_count'] + 199) // 200
        return 0


class ContentDetailResponse(ContentResponse):
    body: Optional[str] = None


class ContentListResponse(BaseModel):
    items: List[ContentResponse]
    total: int
    page: int
    page_size: int
    has_next: bool


class BulkTagsUpdate(BaseModel):
    content_ids: List[UUID]
    tags_to_add: List[str] = []
    tags_to_remove: List[str] = []


class BulkDeleteRequest(BaseModel):
    content_ids: List[UUID]


class BulkDeleteResponse(BaseModel):
    deleted_count: int


class BulkTagsResponse(BaseModel):
    updated_count: int


class BulkMarkReadRequest(BaseModel):
    content_ids: List[UUID]
    is_read: bool = True


class BulkMarkReadResponse(BaseModel):
    updated_count: int


class BulkExportRequest(BaseModel):
    content_ids: List[UUID]


class BulkExportResponse(BaseModel):
    items: List[ContentDetailResponse]
    export_date: datetime = Field(default_factory=datetime.now)


class EnrichQueuedResponse(BaseModel):
    message: str
    content_id: UUID


class AcceptTagsRequest(BaseModel):
    tags: List[str]


class ProgressUpdateRequest(BaseModel):
    reading_progress: float = Field(ge=0.0, le=1.0)


class ProgressUpdateResponse(BaseModel):
    reading_progress: float
    is_read: bool
