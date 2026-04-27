"""
Collections API endpoints.

Provides REST endpoints for:
- Creating, listing, updating, deleting collections
- Adding/removing content from collections
- Reordering collections
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.db.session import get_db
from app.models.user import User
from app.api.auth import get_current_user
from app.schemas.collection import (
    CollectionCreate,
    CollectionUpdate,
    CollectionResponse,
    CollectionListResponse,
    CollectionReorderRequest,
    AddToCollectionRequest,
    AddToCollectionResponse,
)
from app.schemas.content import ContentListResponse
from app.services.collection_service import collection_service
from app.services.content_service import ContentService


router = APIRouter(prefix="/collections", tags=["Collections"])


@router.post("", response_model=CollectionResponse, status_code=status.HTTP_201_CREATED)
def create_collection(request: CollectionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Create a new collection.
    
    - name: Required name for the collection
    - description: Optional description
    - color: Hex color code (default: #1A3A5C)
    - icon: Emoji or icon (default: 📁)
    - is_pinned: Whether to pin the collection (default: false)
    """
    collection = collection_service.create_collection(
        db=db,
        owner_id=str(current_user.id),
        name=request.name,
        description=request.description,
        color=request.color,
        icon=request.icon,
        is_pinned=request.is_pinned
    )
    
    return CollectionResponse(
        id=collection.id,
        name=collection.name,
        description=collection.description,
        color=collection.color,
        icon=collection.icon,
        is_pinned=collection.is_pinned,
        sort_order=collection.sort_order,
        item_count=0,
        preview_images=[],
        created_at=collection.created_at,
        updated_at=collection.updated_at,
    )


@router.get("", response_model=CollectionListResponse)
def list_collections(
    include_empty: bool = Query(True, description="Include collections with no content"),
    sort: str = Query("newest", enum=["name", "newest", "item_count", "manual"], description="Sort order"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user, use_cache=False)
):
    """
    List all collections with content counts and preview images.
    
    - include_empty: Whether to include collections with no content (default: true)
    - sort: Sort order - 'name', 'newest', 'item_count', 'manual' (default: newest)
    
    Note: Pinned collections always sort first regardless of sort param
    """
    collections = collection_service.list_collections(
        db,
        owner_id=str(current_user.id),
        include_empty=include_empty,
        sort=sort
    )
    
    collection_responses = [
        CollectionResponse(
            id=c['id'],
            name=c['name'],
            description=c['description'],
            color=c['color'],
            icon=c['icon'],
            is_pinned=c['is_pinned'],
            sort_order=c['sort_order'],
            item_count=c['item_count'],
            preview_images=c['preview_images'],
            created_at=c['created_at'],
            updated_at=c['updated_at'],
        )
        for c in collections
    ]
    
    return CollectionListResponse(
        collections=collection_responses,
        total=len(collection_responses)
    )


@router.get("/{collection_id}", response_model=CollectionResponse)
def get_collection(
    collection_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a single collection with its item count and preview images.
    """
    collection = collection_service.get_collection(db, collection_id, str(current_user.id))
    if not collection:
        raise HTTPException(
            status_code=404,
            detail=f"Collection {collection_id} not found"
        )
    
    item_count = collection_service.get_collection_content_count(db, collection_id, str(current_user.id))
    preview_images = collection_service.get_collection_preview_images(db, collection_id, owner_id=str(current_user.id))
    
    return CollectionResponse(
        id=collection.id,
        name=collection.name,
        description=collection.description,
        color=collection.color,
        icon=collection.icon,
        is_pinned=collection.is_pinned,
        sort_order=collection.sort_order,
        item_count=item_count,
        preview_images=preview_images,
        created_at=collection.created_at,
        updated_at=collection.updated_at,
    )


@router.put("/{collection_id}", response_model=CollectionResponse)
def update_collection(
    collection_id: UUID,
    request: CollectionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a collection's details.
    """
    update_data = request.model_dump(exclude_unset=True)
    
    collection = collection_service.update_collection(
        db=db,
        owner_id=str(current_user.id),
        collection_id=collection_id,
        **update_data
    )
    
    if not collection:
        raise HTTPException(
            status_code=404,
            detail=f"Collection {collection_id} not found"
        )
    
    item_count = collection_service.get_collection_content_count(db, collection_id, str(current_user.id))
    preview_images = collection_service.get_collection_preview_images(db, collection_id, owner_id=str(current_user.id))
    
    return CollectionResponse(
        id=collection.id,
        name=collection.name,
        description=collection.description,
        color=collection.color,
        icon=collection.icon,
        is_pinned=collection.is_pinned,
        sort_order=collection.sort_order,
        item_count=item_count,
        preview_images=preview_images,
        created_at=collection.created_at,
        updated_at=collection.updated_at,
    )


@router.delete("/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_collection(collection_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Delete a collection.
    
    Does NOT delete the content items (only removes memberships).
    """
    success = collection_service.delete_collection(db, str(current_user.id), collection_id)
    
    if not success:
        raise HTTPException(
            status_code=404,
            detail=f"Collection {collection_id} not found"
        )
    
    return None


@router.get("/{collection_id}/content", response_model=ContentListResponse)
def get_collection_content(
    collection_id: UUID,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    sort: str = Query("newest", enum=["newest", "oldest", "last_opened", "reading_time_asc", "reading_time_desc", "alpha_asc", "alpha_desc"], description="Sort order"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get content in a collection.
    
    Same pagination/sort/filter params as GET /content, scoped to the collection.
    """
    # Verify collection exists
    collection = collection_service.get_collection(db, collection_id, str(current_user.id))
    if not collection:
        raise HTTPException(
            status_code=404,
            detail=f"Collection {collection_id} not found"
        )
    
    # Get content in collection
    content_items = collection_service.get_content_in_collection(
        db,
        owner_id=str(current_user.id),
        collection_id=collection_id,
        limit=page_size,
        offset=(page - 1) * page_size,
        sort=sort
    )
    
    # Get total count
    total = collection_service.get_collection_content_count(db, collection_id, str(current_user.id))
    
    # Convert to response format
    from app.schemas.content import ContentResponse
    from datetime import datetime
    
    items = []
    for c in content_items:
        items.append(ContentResponse(
            id=c.id,
            source_url=c.source_url,
            domain=c.domain,
            og_image_url=c.og_image_url,
            favicon_url=c.favicon_url,
            title=c.title,
            author=c.author,
            summary=c.summary,
            suggested_tags=c.suggested_tags or [],
            tags=c.tags or [],
            notes=c.notes,
            word_count=c.word_count,
            reading_time_minutes=c.reading_time_minutes,
            difficulty=c.difficulty,
            readability_score=c.readability_score,
            is_truncated=c.is_truncated,
            is_read=c.is_read,
            reading_progress=c.reading_progress,
            enrichment_status=c.enrichment_status,
            published_at=c.published_at,
            last_opened_at=c.last_opened_at,
            created_at=c.created_at,
            updated_at=c.updated_at,
        ))
    
    return ContentListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        has_next=(page * page_size) < total
    )


@router.post("/{collection_id}/content", response_model=AddToCollectionResponse)
def add_content_to_collection(
    collection_id: UUID,
    request: AddToCollectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Add content to a collection.
    
    Body: { "content_ids": [UUID, UUID, ...] }
    Returns: { "added_count": 3, "already_present": 1 }
    """
    result = collection_service.add_content_to_collection_bulk(
        db=db,
        owner_id=str(current_user.id),
        collection_id=collection_id,
        content_ids=request.content_ids
    )
    
    # Check if collection exists
    collection = collection_service.get_collection(db, collection_id, str(current_user.id))
    if not collection:
        raise HTTPException(
            status_code=404,
            detail=f"Collection {collection_id} not found"
        )
    
    return AddToCollectionResponse(
        added_count=result["added_count"],
        already_present=result["already_present"]
    )


@router.delete("/{collection_id}/content/{content_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_content_from_collection(
    collection_id: UUID,
    content_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Remove content from a collection.
    """
    success = collection_service.remove_content_from_collection(
        db=db,
        owner_id=str(current_user.id),
        collection_id=collection_id,
        content_id=content_id
    )
    
    if not success:
        raise HTTPException(
            status_code=404,
            detail=f"Content {content_id} not found in collection {collection_id}"
        )
    
    return None


@router.put("/reorder", status_code=status.HTTP_200_OK)
def reorder_collections(
    request: CollectionReorderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Reorder collections.
    
    Body: { "ordered_ids": [UUID, UUID, ...] }
    Updates sort_order on all collections atomically.
    """
    updated_count = collection_service.reorder_collections(
        db=db,
        owner_id=str(current_user.id),
        ordered_ids=request.ordered_ids
    )
    
    return {"updated_count": updated_count}


@router.get("/content/{content_id}", response_model=List[CollectionResponse])
def get_collections_for_content(content_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Get all collections that contain specific content.
    """
    from app.models.content import Content
    
    # Verify content exists
    content = db.query(Content).filter(Content.id == content_id, Content.user_id == str(current_user.id)).first()
    if not content:
        raise HTTPException(
            status_code=404,
            detail=f"Content {content_id} not found"
        )
    
    collections = collection_service.get_collections_for_content(db, str(current_user.id), content_id)
    
    result = []
    for c in collections:
        item_count = collection_service.get_collection_content_count(db, c.id, str(current_user.id))
        preview_images = collection_service.get_collection_preview_images(db, c.id, owner_id=str(current_user.id))
        
        result.append(CollectionResponse(
            id=c.id,
            name=c.name,
            description=c.description,
            color=c.color,
            icon=c.icon,
            is_pinned=c.is_pinned,
            sort_order=c.sort_order,
            item_count=item_count,
            preview_images=preview_images,
            created_at=c.created_at,
            updated_at=c.updated_at,
        ))
    
    return result
