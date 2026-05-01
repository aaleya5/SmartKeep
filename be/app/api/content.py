from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from typing import Optional
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.api.auth import get_current_user
from app.schemas.content import (
    ContentCreate,
    ContentManualCreate,
    ContentUpdate,
    ContentResponse,
    ContentDetailResponse,
    ContentListResponse,
    BulkTagsUpdate,
    BulkDeleteRequest,
    BulkDeleteResponse,
    BulkTagsResponse,
    EnrichQueuedResponse,
    AcceptTagsRequest,
    ProgressUpdateRequest,
    ProgressUpdateResponse,
    SortEnum,
    EnrichmentStatusEnum,
    DifficultyEnum,
)
from app.services.content_service import (
    ContentService,
    DuplicateURLError,
    ContentNotFoundError,
)
from app.services.enrichment_service import enrichment_service
from app.models.content import Content
from uuid import UUID
from typing import Optional, List
from datetime import datetime

router = APIRouter(prefix="/content", tags=["Content"])


@router.post("", response_model=ContentResponse, status_code=status.HTTP_201_CREATED)
async def create_from_url(request: ContentCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Create content from URL.
    
    - Validates URL format
    - Checks for duplicate
    - Scrapes content
    - Saves to database
    - Triggers background enrichment
    
    Returns 201 with enrichment_status: "pending"
    Errors: 409 if duplicate, 422 if invalid URL, 502 if unreachable
    """
    try:
        return await ContentService.create_from_url(db, str(request.url), str(current_user.id), background_tasks)
    except DuplicateURLError as e:
        raise HTTPException(
            status_code=409,
            detail={
                "message": str(e),
                "existing_id": str(e.content_id),
                "saved_at": e.saved_at.isoformat() if e.saved_at else None,
                "title": e.title,
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Scraping error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=502, detail=f"Unable to fetch URL content. Please try manual entry.")


@router.post("/manual", response_model=ContentResponse, status_code=status.HTTP_201_CREATED)
def create_manual(request: ContentManualCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Create content manually (skip scraping).
    
    - Skips scraping
    - Saves directly
    - Triggers enrichment on title + body
    
    Returns 201 ContentResponse
    """
    try:
        return ContentService.create_manual(
            db,
            title=request.title,
            body=request.body,
            owner_id=str(current_user.id),
            source_url=str(request.source_url) if request.source_url else None,
            tags=request.tags,
            notes=request.notes,
            background_tasks=background_tasks,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=ContentListResponse)
def get_content_list(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    sort: SortEnum = Query(SortEnum.newest, description="Sort order"),
    tags: Optional[str] = Query(None, description="Comma-separated tags (filters to items containing ALL listed tags)"),
    domain: Optional[str] = Query(None, description="Filter by domain"),
    collection_id: Optional[UUID] = Query(None, description="Filter by collection ID"),
    date_from: Optional[datetime] = Query(None, description="Filter from date (ISO)"),
    date_to: Optional[datetime] = Query(None, description="Filter to date (ISO)"),
    min_reading_time: Optional[int] = Query(None, ge=0, description="Min reading time in minutes"),
    max_reading_time: Optional[int] = Query(None, ge=0, description="Max reading time in minutes"),
    difficulty: Optional[DifficultyEnum] = Query(None, description="Difficulty level"),
    is_read: Optional[bool] = Query(None, description="Filter by read status"),
    enrichment_status: Optional[EnrichmentStatusEnum] = Query(None, description="Enrichment status"),
    is_truncated: Optional[bool] = Query(None, description="Filter by truncation status"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user, use_cache=False),
):
    """
    Get list of content with filtering and pagination.
    
    Query params:
    - page: Page number (default 1)
    - page_size: Items per page (default 20, max 100)
    - sort: Sort order (newest, oldest, last_opened, reading_time_asc, reading_time_desc, alpha_asc, alpha_desc)
    - tags: Comma-separated string, filters to items containing ALL listed tags
    - domain: Filter by domain
    - collection_id: Filter by collection (not implemented yet)
    - date_from, date_to: ISO date strings
    - min_reading_time, max_reading_time: Minutes
    - difficulty: easy, intermediate, advanced
    - is_read: Boolean
    - enrichment_status: pending, processing, complete, failed
    - is_truncated: Boolean
    """
    try:
        # Parse tags from comma-separated string
        tag_list = None
        if tags:
            tag_list = [t.strip() for t in tags.split(",") if t.strip()]
        
        items, total = ContentService.get_list(
            db,
            owner_id=str(current_user.id),
            page=page,
            page_size=page_size,
            sort=sort.value,
            tags=tag_list,
            domain=domain,
            date_from=date_from,
            date_to=date_to,
            min_reading_time=min_reading_time,
            max_reading_time=max_reading_time,
            difficulty=difficulty.value if difficulty else None,
            is_read=is_read,
            enrichment_status=enrichment_status.value if enrichment_status else None,
            is_truncated=is_truncated,
        )
        
        has_next = (page * page_size) < total
        
        return ContentListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            has_next=has_next,
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Error fetching content: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Internal server error occurred while fetching content list."
        )


@router.get("/{content_id}", response_model=ContentDetailResponse)
def get_content(content_id: UUID, db: Session = Depends(get_db), current_user: Optional[User] = Depends(get_current_user, use_cache=False)):
    """
    Get content by ID.
    
    Also updates last_opened_at = NOW() via side-effect UPDATE.
    Returns 200 ContentResponse or 404 if not found.
    """
    owner_id = str(current_user.id) if current_user else None
    content = ContentService.get_by_id(db, content_id, owner_id)
    if not content:
        raise HTTPException(status_code=404, detail=f"Content {content_id} not found")
    return content


@router.put("/{content_id}", response_model=ContentResponse)
def update_content(content_id: UUID, request: ContentUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Update content (partial update - PATCH semantics).
    
    Body: ContentUpdate with optional fields
    Returns 200 ContentResponse or 404 if not found.
    """
    try:
        # Filter out None values
        updates = {k: v for k, v in request.model_dump().items() if v is not None}
        return ContentService.update(db, content_id, str(current_user.id), updates)
    except ContentNotFoundError:
        raise HTTPException(status_code=404, detail=f"Content {content_id} not found")


@router.delete("/{content_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_content(content_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Delete content.
    
    Deletes the item and all associated annotations and collection memberships (CASCADE in DB).
    Returns 204 No Content or 404 if not found.
    """
    try:
        ContentService.delete(db, content_id, str(current_user.id))
    except ContentNotFoundError:
        raise HTTPException(status_code=404, detail=f"Content {content_id} not found")


@router.delete("/bulk", response_model=BulkDeleteResponse)
def bulk_delete_content(request: BulkDeleteRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Bulk delete content.
    
    Body: BulkDeleteRequest with content_ids
    Returns 200 { "deleted_count": n }
    """
    deleted_count = ContentService.bulk_delete(db, str(current_user.id), request.content_ids)
    return BulkDeleteResponse(deleted_count=deleted_count)


@router.post("/{content_id}/enrich", response_model=EnrichQueuedResponse, status_code=status.HTTP_202_ACCEPTED)
def enrich_content(content_id: UUID, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Re-trigger background enrichment task.
    
    Re-triggers the background enrichment task (summary + tags + embedding) 
    regardless of current status. Sets enrichment_status = "processing".
    Returns 202 { "message": "Enrichment queued", "content_id": "..." }
    """
    try:
        ContentService.trigger_enrichment(db, content_id, str(current_user.id), background_tasks)
        return EnrichQueuedResponse(
            message="Enrichment queued",
            content_id=content_id,
        )
    except ContentNotFoundError:
        raise HTTPException(status_code=404, detail=f"Content {content_id} not found")


@router.post("/{content_id}/accept-tags", response_model=ContentResponse)
def accept_tags(content_id: UUID, request: AcceptTagsRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Accept suggested tags.
    
    Body: { "tags": ["python", "backend"] } — subset of suggested_tags
    Action: Merges accepted tags into tags array, clears suggested_tags
    Returns 200 ContentResponse
    """
    try:
        return ContentService.accept_tags(db, content_id, str(current_user.id), request.tags)
    except ContentNotFoundError:
        raise HTTPException(status_code=404, detail=f"Content {content_id} not found")


@router.patch("/bulk/tags", response_model=BulkTagsResponse)
def bulk_update_tags(request: BulkTagsUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Bulk update tags.
    
    Body: BulkTagsUpdate with content_ids, tags_to_add, tags_to_remove
    Action: Adds or removes tags from multiple items atomically
    Returns 200 { "updated_count": n }
    """
    updated_count = ContentService.bulk_update_tags(
        db,
        str(current_user.id),
        request.content_ids,
        request.tags_to_add,
        request.tags_to_remove,
    )
    return BulkTagsResponse(updated_count=updated_count)


@router.patch("/{content_id}/progress", response_model=ProgressUpdateResponse)
def update_reading_progress(content_id: UUID, request: ProgressUpdateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Update reading progress.
    
    Body: { "reading_progress": 0.75 }
    Action: Updates reading progress. Automatically sets is_read = true if progress >= 0.95.
    Returns 200 { "reading_progress": 0.75, "is_read": false }
    """
    try:
        reading_progress, is_read = ContentService.update_reading_progress(
            db, content_id, str(current_user.id), request.reading_progress
        )
        return ProgressUpdateResponse(
            reading_progress=reading_progress,
            is_read=is_read,
        )
    except ContentNotFoundError:
        raise HTTPException(status_code=404, detail=f"Content {content_id} not found")
