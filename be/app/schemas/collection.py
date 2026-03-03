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
    color: str = "#6366f1"  # Default indigo color
    
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
    name: str
    description: Optional[str] = None
    color: str
    created_at: datetime
    document_count: int = 0  # Calculated field
    
    @field_serializer('created_at')
    @staticmethod
    def serialize_datetime(value: datetime | None) -> str | None:
        if value is None:
            return None
        if isinstance(value, str):
            return value
        return value.isoformat()


class CollectionWithDocuments(CollectionResponse):
    """Schema for collection with its documents."""
    documents: List["DocumentInCollection"] = []
    
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
    """Schema for adding a document to a collection."""
    document_id: int


class CollectionListResponse(BaseModel):
    """Schema for list of collections."""
    collections: List[CollectionResponse]
    total: int


# Import forward reference
from app.schemas.document import DocumentResponse

# Update forward reference
CollectionWithDocuments.model_rebuild()
