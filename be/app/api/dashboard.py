"""
Dashboard API endpoint.

Provides a single aggregated endpoint for dashboard data.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.dashboard import DashboardResponse
from app.schemas.content import ContentResponse
from app.schemas.collection import CollectionResponse
from app.schemas.dashboard import SavesPerDay, TrendingTag
from app.services.dashboard_service import dashboard_service


router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("", response_model=DashboardResponse)
def get_dashboard(db: Session = Depends(get_db)):
    """
    Get all dashboard data in a single aggregated query.
    
    Returns:
    - recent_saves: last 9 items
    - continue_reading: last 5 opened with progress > 0 and < 1
    - collections_preview: all collections with previews
    - trending_tags: from /tags/trending
    - saves_this_week: daily save counts for last 7 days
    - suggested_rereads: old items (30+ days), never annotated
    - total_items: total content count
    - total_reading_hours: total estimated reading hours
    - total_annotations: total annotation count
    
    Performance target: < 200ms
    """
    data = dashboard_service.get_dashboard_data(db)
    
    # Convert content to response format
    def content_to_response(content):
        return ContentResponse(
            id=content.id,
            source_url=content.source_url,
            domain=content.domain,
            og_image_url=content.og_image_url,
            favicon_url=content.favicon_url,
            title=content.title,
            author=content.author,
            summary=content.summary,
            suggested_tags=content.suggested_tags or [],
            tags=content.tags or [],
            notes=content.notes,
            word_count=content.word_count,
            reading_time_minutes=content.reading_time_minutes,
            difficulty=content.difficulty,
            readability_score=content.readability_score,
            is_truncated=content.is_truncated,
            is_read=content.is_read,
            reading_progress=content.reading_progress,
            enrichment_status=content.enrichment_status,
            published_at=content.published_at,
            last_opened_at=content.last_opened_at,
            created_at=content.created_at,
            updated_at=content.updated_at,
        )
    
    # Convert collections to response format
    def collection_to_response(coll):
        return CollectionResponse(
            id=coll['id'],
            name=coll['name'],
            description=coll['description'],
            color=coll['color'],
            icon=coll['icon'],
            is_pinned=coll['is_pinned'],
            sort_order=coll['sort_order'],
            item_count=coll['item_count'],
            preview_images=coll['preview_images'],
            created_at=coll['created_at'],
            updated_at=coll['updated_at'],
        )
    
    return DashboardResponse(
        recent_saves=[content_to_response(c) for c in data['recent_saves']],
        continue_reading=[content_to_response(c) for c in data['continue_reading']],
        collections_preview=[collection_to_response(c) for c in data['collections_preview']],
        trending_tags=[TrendingTag(**t) for t in data['trending_tags']],
        saves_this_week=[SavesPerDay(**s) for s in data['saves_this_week']],
        suggested_rereads=[content_to_response(c) for c in data['suggested_rereads']],
        total_items=data['total_items'],
        total_reading_hours=data['total_reading_hours'],
        total_annotations=data['total_annotations'],
    )
