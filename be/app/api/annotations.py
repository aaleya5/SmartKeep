"""
Annotations API endpoints.

Provides REST endpoints for:
- Creating, listing, updating, deleting annotations
- Global annotations view with filtering
- Export annotations
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.db.session import get_db
from app.api.auth import get_current_user
from app.schemas.annotation import (
    AnnotationCreate,
    AnnotationUpdate,
    AnnotationResponse,
    AnnotationWithSourceResponse,
    AnnotationListResponse,
    AnnotationWithSourceListResponse,
    ExportFormatEnum,
)
from app.services.annotation_service import annotation_service
from app.services.content_service import ContentService

router = APIRouter(tags=["Annotations"])


@router.post("/content/{content_id}/annotations", response_model=AnnotationResponse, status_code=status.HTTP_201_CREATED)
def create_annotation(
    content_id: UUID,
    request: AnnotationCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Create an annotation on content.
    """
    # Verify ownership
    from app.models.content import Content
    content = db.query(Content).filter(Content.id == content_id, Content.user_id == str(current_user.id)).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found or access denied")
        
    annotation = annotation_service.create_annotation(
        db=db,
        content_id=content_id,
        selected_text=request.selected_text,
        note=request.note,
        color=request.color,
        position_start=request.position_start,
        position_end=request.position_end,
    )
    
    if not annotation:
        raise HTTPException(status_code=404, detail=f"Content {content_id} not found")
    
    return AnnotationResponse(
        id=annotation.id,
        content_id=annotation.content_id,
        selected_text=annotation.selected_text,
        note=annotation.note,
        color=annotation.color,
        position_start=annotation.position_start,
        position_end=annotation.position_end,
        created_at=annotation.created_at,
        updated_at=annotation.updated_at,
    )


@router.get("/content/{content_id}/annotations", response_model=AnnotationListResponse)
def get_content_annotations(
    content_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get all annotations for content.
    
    Returns annotations ordered by position_start ASC.
    """
    from app.models.content import Content
    # Verify content exists (no owner filter — auth is handled by JWT middleware)
    content = db.query(Content).filter(Content.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail=f"Content {content_id} not found")
    
    annotations = annotation_service.get_annotations_for_content(db, content_id)
    
    items = [
        AnnotationResponse(
            id=ann.id,
            content_id=ann.content_id,
            selected_text=ann.selected_text,
            note=ann.note,
            color=ann.color,
            position_start=ann.position_start,
            position_end=ann.position_end,
            created_at=ann.created_at,
            updated_at=ann.updated_at,
        )
        for ann in annotations
    ]
    
    return AnnotationListResponse(
        annotations=items,
        total=len(items)
    )


@router.put("/annotations/{annotation_id}", response_model=AnnotationResponse)
def update_annotation(
    annotation_id: UUID,
    request: AnnotationUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Update an annotation.
    
    Body: AnnotationUpdate with note and/or color
    Returns 200 AnnotationResponse
    Errors: 404
    """
    update_data = request.model_dump(exclude_unset=True)
    
    annotation = annotation_service.update_annotation(
        db=db,
        annotation_id=annotation_id,
        **update_data
    )
    
    if not annotation:
        raise HTTPException(status_code=404, detail=f"Annotation {annotation_id} not found")
    
    return AnnotationResponse(
        id=annotation.id,
        content_id=annotation.content_id,
        selected_text=annotation.selected_text,
        note=annotation.note,
        color=annotation.color,
        position_start=annotation.position_start,
        position_end=annotation.position_end,
        created_at=annotation.created_at,
        updated_at=annotation.updated_at,
    )


@router.delete("/annotations/{annotation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_annotation(
    annotation_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Delete an annotation.
    
    Returns 204 No Content
    Errors: 404
    """
    success = annotation_service.delete_annotation(db, annotation_id)
    
    if not success:
        raise HTTPException(status_code=404, detail=f"Annotation {annotation_id} not found")
    
    return None


@router.get("/annotations", response_model=AnnotationWithSourceListResponse)
def list_annotations(
    color: Optional[str] = Query(None, description="Filter by color"),
    content_tags: Optional[str] = Query(None, description="Filter by content tags (comma-separated)"),
    domain: Optional[str] = Query(None, description="Filter by domain"),
    collection_id: Optional[UUID] = Query(None, description="Filter by collection ID"),
    date_from: Optional[datetime] = Query(None, description="Filter from date"),
    date_to: Optional[datetime] = Query(None, description="Filter to date"),
    sort: str = Query("newest", enum=["newest", "oldest", "source_title"], description="Sort order"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get all annotations with filtering and pagination.
    
    Query params:
    - color: Filter by annotation color (yellow, green, pink, blue)
    - content_tags: Comma-separated tags to filter by (filters by tags on parent content)
    - domain: Filter by content domain
    - collection_id: Filter by collection
    - date_from, date_to: Filter by annotation date
    - sort: newest, oldest, source_title
    - page, page_size: Pagination
    """
    # Parse tags
    tag_list = None
    if content_tags:
        tag_list = [t.strip() for t in content_tags.split(",") if t.strip()]
    
    annotations, total = annotation_service.list_annotations(
        db=db,
        owner_id=str(current_user.id),
        color=color,
        content_tags=tag_list,
        domain=domain,
        collection_id=collection_id,
        date_from=date_from,
        date_to=date_to,
        sort=sort,
        page=page,
        page_size=page_size,
    )
    
    items = [
        AnnotationWithSourceResponse(
            id=UUID(a['id']),
            content_id=a['content_id'],
            selected_text=a['selected_text'],
            note=a['note'],
            color=a['color'],
            position_start=a['position_start'],
            position_end=a['position_end'],
            created_at=a['created_at'],
            updated_at=a['updated_at'],
            content_title=a['content_title'],
            content_domain=a['content_domain'],
            content_favicon_url=a['content_favicon_url'],
            content_tags=a['content_tags'],
        )
        for a in annotations
    ]
    
    return AnnotationWithSourceListResponse(
        annotations=items,
        total=total
    )


@router.get("/annotations/export")
def export_annotations(
    format: ExportFormatEnum = Query(ExportFormatEnum.markdown, description="Export format"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Export all annotations.
    
    Query params:
    - format: markdown (default) or json
    
    Returns file with Content-Disposition header for download.
    """
    content = annotation_service.export_annotations(db, format=format.value)
    
    filename = f"smartkeep-annotations.{'md' if format == 'markdown' else 'json'}"
    content_type = "text/markdown" if format == "markdown" else "application/json"
    
    from fastapi.responses import Response
    return Response(
        content=content,
        media_type=content_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
