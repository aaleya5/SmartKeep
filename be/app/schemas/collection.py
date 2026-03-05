"""
Pydantic schemas for Collections API.

This module defines request/response schemas for:
- Collection: User-created collections/spaces
- ContentCollection: Join table entries
"""

from pydantic import BaseModel, field_serializer, field_validator, ConfigDict
from datetime import datetime
from typing import Optional, List
from uuid import UUID
import re


class CollectionCreate(BaseModel):
    """Schema for creating a new collection."""
    name: str
    description: Optional[str] = None
    color: str = "#1A3A5C"
    icon: str = "📁"
    is_pinned: bool = False
    
    @field_validator('color')
    @classmethod
    def validate_color(cls, v: str) -> str:
        """Validate that color is a valid hex color code."""
        if not v:
            return '#1A3A5C'
        if not re.match(r'^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$', v):
            raise ValueError('Color must be a valid hex color code (e.g., #1A3A5C or #FFF)')
        return v


class CollectionUpdate(BaseModel):
    """Schema for updating an existing collection."""
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    is_pinned: Optional[bool] = None
    sort_order: Optional[int] = None
    
    @field_validator('color')
    @classmethod
    def validate_color(cls, v: Optional[str]) -> Optional[str]:
        """Validate that color is a valid hex color code if provided."""
        if v is None:
            return v
        if not v:
            return '#1A3A5C'
        if not re.match(r'^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$', v):
            raise ValueError('Color must be a valid hex color code (e.g., #1A3A5C or #FFF)')
        return v


class CollectionResponse(BaseModel):
    """Schema for collection responses."""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    name: str
    description: Optional[str] = None
    color: str
    icon: str = "📁"
    is_pinned: bool = False
    sort_order: int = 0
    item_count: int = 0
    preview_images: List[str] = []
    created_at: datetime
    updated_at: datetime
    
    @field_serializer('created_at')
    @staticmethod
    def serialize_datetime(value: datetime | None) -> str | None:
        if value is None:
            return None
        if isinstance(value, str):
            return value
        return value.isoformat()
    
    @field_serializer('updated_at')
    @staticmethod
    def serialize_datetime_updated(value: datetime | None) -> str | None:
        if value is None:
            return None
        if isinstance(value, str):
            return value
        return value.isoformat()


class CollectionReorderRequest(BaseModel):
    """Schema for reordering collections."""
    ordered_ids: List[UUID]


class AddToCollectionRequest(BaseModel):
    """Schema for adding content to a collection (bulk)."""
    content_ids: List[UUID]


class AddToCollectionResponse(BaseModel):
    """Response for adding content to collection."""
    added_count: int
    already_present: int


class CollectionListResponse(BaseModel):
    """Schema for list of collections."""
    collections: List[CollectionResponse]
    total: int
