"""
Pydantic schemas for Collections API.

This module defines request/response schemas for:
- Collection: User-created collections/spaces
- ContentCollection: Join table entries
"""

from pydantic import BaseModel, field_serializer, field_validator, ConfigDict
from datetime import datetime
from typing import Optional, List
import re


class CollectionCreate(BaseModel):
    """Schema for creating a new collection."""
    name: str
    description: Optional[str] = None
    color: str = "#6366f1"
    icon: str = "📁"
    is_pinned: bool = False
    
    @field_validator('color')
    @classmethod
    def validate_color(cls, v: str) -> str:
        """Validate that color is a valid hex color code."""
        if not v:
            return '#6366f1'  # Default
        # Check for valid hex color format (#RRGGBB or #RGB)
        if not re.match(r'^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$', v):
            raise ValueError('Color must be a valid hex color code (e.g., #6366f1 or #FFF)')
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
            return '#6366f1'  # Default
        # Check for valid hex color format (#RRGGBB or #RGB)
        if not re.match(r'^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$', v):
            raise ValueError('Color must be a valid hex color code (e.g., #6366f1 or #FFF)')
        return v


class CollectionResponse(BaseModel):
    """Schema for collection responses."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    uuid: Optional[str] = None
    name: str
    description: Optional[str] = None
    color: str
    icon: str = "📁"
    is_pinned: bool = False
    sort_order: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Alias for document_count - matches architecture naming
    @property
    def item_count(self) -> int:
        """Get the number of documents in this collection."""
        return getattr(self, 'document_count', 0)
    
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


class CollectionWithDocuments(CollectionResponse):
    """Schema for collection with its documents."""
    documents: List["DocumentInCollection"] = []
    preview_images: List[str] = []
    
    @field_serializer('documents')
    @staticmethod
    def serialize_documents(value: List) -> List[dict]:
        return [
            {
                "id": doc.id,
                "title": doc.title,
                "content": doc.content[:100] + "..." if len(doc.content) > 100 else doc.content,
                "domain": doc.domain,
                "added_at": doc.content_collections[0].created_at if hasattr(doc, 'content_collections') and doc.content_collections else None
            }
            for doc in value
        ]


class DocumentInCollection(BaseModel):
    """Schema for document within a collection."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    title: str
    content: str
    domain: Optional[str] = None
    added_at: Optional[datetime] = None


class AddToCollectionRequest(BaseModel):
    """Schema for adding documents to a collection (bulk)."""
    content_ids: List[int]


class CollectionReorderRequest(BaseModel):
    """Schema for reordering collections."""
    ordered_ids: List[int]


class CollectionListResponse(BaseModel):
    """Schema for list of collections."""
    collections: List[CollectionResponse]
    total: int


# Import forward reference
from app.schemas.document import DocumentResponse

# Update forward reference
CollectionWithDocuments.model_rebuild()
