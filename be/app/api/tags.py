"""
Tags API endpoints.

Provides REST endpoints for:
- Getting tag statistics
- Getting trending tags
- Getting tag suggestions
- Refreshing tag stats
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime

from app.db.session import get_db
from app.schemas.tag import (
    TagSortEnum,
    TagListResponse,
    TagStatsResponse,
    TrendingTagListResponse,
    TrendingTagResponse,
    SuggestionResponse,
)
from app.services.tag_service import tag_service


router = APIRouter(prefix="/tags", tags=["Tags"])


@router.get("", response_model=TagListResponse)
def get_tags(
    sort: TagSortEnum = Query(TagSortEnum.count_desc, description="Sort order"),
    limit: int = Query(50, ge=1, le=500, description="Maximum tags to return"),
    db: Session = Depends(get_db)
):
    """
    Get tag statistics from materialized view.
    
    Query params:
    - sort: count_desc, count_asc, alpha (default: count_desc)
    - limit: Maximum tags to return (default: 50)
    
    Returns list of tags with item counts and last used date.
    """
    tags = tag_service.get_tag_stats(db, sort=sort.value, limit=limit)
    
    items = [
        TagStatsResponse(
            tag=t["tag"],
            item_count=t["item_count"],
            last_used_at=t["last_used_at"],
        )
        for t in tags
    ]
    
    return TagListResponse(tags=items)


@router.get("/trending", response_model=TrendingTagListResponse)
def get_trending_tags(
    days: int = Query(30, ge=1, le=365, description="Number of days to look back"),
    limit: int = Query(10, ge=1, le=50, description="Maximum tags to return"),
    db: Session = Depends(get_db)
):
    """
    Get trending tags based on recent activity.
    
    Query params:
    - days: Number of days to look back (default: 30)
    - limit: Maximum tags to return (default: 10)
    
    Returns top tags with recent_count and total_count.
    """
    tags = tag_service.get_trending_tags(db, days=days, limit=limit)
    
    items = [
        TrendingTagResponse(
            tag=t["tag"],
            recent_count=t["recent_count"],
            total_count=t["total_count"],
        )
        for t in tags
    ]
    
    return TrendingTagListResponse(tags=items)


@router.get("/suggest", response_model=SuggestionResponse)
def get_tag_suggestions(
    q: str = Query(..., min_length=2, description="Partial tag string"),
    limit: int = Query(5, ge=1, le=20, description="Maximum suggestions"),
    db: Session = Depends(get_db)
):
    """
    Get tag suggestions based on prefix.
    
    Query params:
    - q: Partial tag string (minimum 2 characters)
    - limit: Maximum suggestions (default: 5)
    
    Returns autocomplete suggestions for tag input.
    """
    suggestions = tag_service.get_tag_suggestions(db, prefix=q, limit=limit)
    
    return SuggestionResponse(suggestions=suggestions)


@router.post("/refresh-stats")
def refresh_tag_stats(db: Session = Depends(get_db)):
    """
    Refresh the tag_stats materialized view.
    
    This should be called after bulk tag operations.
    Can also be run on a cron job in production.
    
    Returns success message.
    """
    success = tag_service.refresh_tag_stats(db)
    
    if success:
        return {"message": "Tag stats refreshed"}
    else:
        return {"message": "Failed to refresh tag stats"}
