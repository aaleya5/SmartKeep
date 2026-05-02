"""
Pydantic schemas for Annotations API.
"""

from pydantic import BaseModel, field_validator, ConfigDict
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from enum import Enum


class ColorEnum(str, Enum):
    yellow = "yellow"
    green = "green"
    pink = "pink"
    blue = "blue"


class AnnotationCreate(BaseModel):
    """Schema for creating an annotation."""
    selected_text: Optional[str] = None
    note: Optional[str] = None
    color: str = "yellow"
    position_start: Optional[int] = None
    position_end: Optional[int] = None
    
    @field_validator('color')
    @classmethod
    def validate_color(cls, v: str) -> str:
        if v not in ['yellow', 'green', 'pink', 'blue']:
            return 'yellow'
        return v


class AnnotationUpdate(BaseModel):
    """Schema for updating an annotation."""
    note: Optional[str] = None
    color: Optional[str] = None
    
    @field_validator('color')
    @classmethod
    def validate_color(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if v not in ['yellow', 'green', 'pink', 'blue']:
            return 'yellow'
        return v


class AnnotationResponse(BaseModel):
    """Schema for annotation response."""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    content_id: UUID
    selected_text: Optional[str] = None
    note: Optional[str] = None
    color: str
    position_start: Optional[int] = None
    position_end: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class AnnotationWithSourceResponse(AnnotationResponse):
    """Schema for annotation with parent content info (used in global annotations page)."""
    content_title: Optional[str] = ''
    content_domain: Optional[str] = ''
    content_favicon_url: Optional[str] = None
    content_tags: List[str] = []


class AnnotationListResponse(BaseModel):
    """Response for listing annotations."""
    annotations: List[AnnotationResponse]
    total: int


class AnnotationWithSourceListResponse(BaseModel):
    """Response for listing annotations with source info."""
    annotations: List[AnnotationWithSourceResponse]
    total: int


class ExportFormatEnum(str, Enum):
    markdown = "markdown"
    json = "json"
