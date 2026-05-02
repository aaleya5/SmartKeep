from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.search import (
    SearchResponse,
    SearchResultItem,
    SuggestionResponse,
    SearchHistoryResponse,
    SearchHistoryItem,
    SavedSearchCreate,
    SavedSearchResponse,
    SavedSearchesResponse,
)
from app.services.content_search_service import (
    ContentSearchService,
    SearchHistoryService,
    SavedSearchService,
)
from app.models.user import User
from app.api.auth import get_current_user
from typing import Optional, List
from datetime import date, datetime
from uuid import UUID

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("", response_model=SearchResponse)
def search(
    query: str = Query(..., min_length=1, description="Search query string"),
    mode: str = Query("hybrid", enum=["keyword", "semantic", "hybrid"], description="Search mode"),
    tags: Optional[str] = Query(None, description="Comma-separated tags to filter"),
    domain: Optional[str] = Query(None, description="Filter by domain"),
    date_from: Optional[date] = Query(None, description="Filter by date from (ISO)"),
    date_to: Optional[date] = Query(None, description="Filter by date to (ISO)"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty"),
    collection_id: Optional[UUID] = Query(None, description="Filter by collection ID"),
    is_read: Optional[bool] = Query(None, description="Filter by reading status"),
    limit: int = Query(20, ge=1, le=100, description="Number of results"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Unified search endpoint supporting keyword, semantic, and hybrid search.
    
    - **query**: Search query string
    - **mode**: Search mode - "keyword" (PostgreSQL FTS), "semantic" (vector), "hybrid" (combined)
    - **tags**: Comma-separated tags to filter (items containing ALL tags)
    - **domain**: Filter by domain
    - **date_from**: Filter items created after this date
    - **date_to**: Filter items created before this date
    - **difficulty**: Filter by difficulty (easy, intermediate, advanced)
    - **collection_id**: Filter by collection
    - **is_read**: Filter by read/unread status
    - **limit**: Number of results to return (max 100)
    - **offset**: Offset for pagination
    
    Returns search results with relevance scores and highlighted excerpts.
    """
    # Parse tags
    tag_list = None
    if tags:
        tag_list = [t.strip() for t in tags.split(",") if t.strip()]
    
    # Convert dates to datetime
    date_from_dt = datetime.combine(date_from, datetime.min.time()) if date_from else None
    date_to_dt = datetime.combine(date_to, datetime.max.time()) if date_to else None
    
    # Perform search
    search_service = ContentSearchService(db, user_id=str(current_user.id))
    result = search_service.search(
        query=query,
        mode=mode,
        limit=limit,
        offset=offset,
        tags=tag_list,
        domain=domain,
        date_from=date_from_dt,
        date_to=date_to_dt,
        difficulty=difficulty,
        is_read=is_read,
        collection_id=collection_id,
    )
    
    # Log to search history (only for non-empty results)
    if result['items']:
        SearchHistoryService.add_history(
            db, str(current_user.id), query, mode, result['total']
        )
    
    # Build filters applied dict
    filters_applied = {}
    if tag_list:
        filters_applied['tags'] = tag_list
    if domain:
        filters_applied['domain'] = domain
    if date_from:
        filters_applied['date_from'] = str(date_from)
    if date_to:
        filters_applied['date_to'] = str(date_to)
    if difficulty:
        filters_applied['difficulty'] = difficulty
    if is_read is not None:
        filters_applied['is_read'] = is_read
    if collection_id:
        filters_applied['collection_id'] = str(collection_id)
    
    # Convert items to response format
    items = []
    for item in result['items']:
        items.append(SearchResultItem(
            id=UUID(item['id']),
            source_url=item['source_url'],
            domain=item['domain'],
            og_image_url=item.get('og_image_url'),
            favicon_url=item.get('favicon_url'),
            title=item['title'],
            author=item.get('author'),
            summary=item.get('summary'),
            suggested_tags=item.get('suggested_tags', []),
            tags=item.get('tags', []),
            notes=item.get('notes'),
            word_count=item.get('word_count'),
            reading_time_minutes=item.get('reading_time_minutes', 0),
            difficulty=item.get('difficulty'),
            readability_score=item.get('readability_score'),
            is_truncated=item.get('is_truncated', False),
            is_read=item.get('is_read', False),
            reading_progress=item.get('reading_progress', 0.0),
            enrichment_status=item.get('enrichment_status', 'pending'),
            published_at=datetime.fromisoformat(item['published_at']) if item.get('published_at') else None,
            last_opened_at=datetime.fromisoformat(item['last_opened_at']) if item.get('last_opened_at') else None,
            created_at=datetime.fromisoformat(item['created_at']) if item.get('created_at') else datetime.utcnow(),
            updated_at=datetime.fromisoformat(item['updated_at']) if item.get('updated_at') else datetime.utcnow(),
            relevance_score=item.get('relevance_score'),
            similarity_score=item.get('similarity_score'),
            combined_score=item.get('combined_score'),
            matched_excerpt=item.get('matched_excerpt'),
        ))
    
    return SearchResponse(
        items=items,
        total=result['total'],
        query=query,
        mode=mode,
        latency_ms=int(result['latency_ms']),
        filters_applied=filters_applied,
    )


@router.get("/suggestions", response_model=SuggestionResponse)
def get_suggestions(
    q: str = Query(..., min_length=2, description="Partial query for autocomplete"),
    limit: int = Query(5, ge=1, le=10, description="Max suggestions to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get title-based autocomplete suggestions.
    
    Returns up to 5 title suggestions based on the partial query.
    """
    search_service = ContentSearchService(db, user_id=str(current_user.id))
    suggestions = search_service.get_suggestions(q, limit)
    return SuggestionResponse(suggestions=suggestions)


@router.get("/history", response_model=SearchHistoryResponse)
def get_search_history(
    limit: int = Query(20, ge=1, le=100, description="Number of history items to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get recent search history.
    
    Returns the last 20 search queries.
    """
    history = SearchHistoryService.get_history(db, str(current_user.id), limit)
    items = [
        SearchHistoryItem(
            query=h.query,
            mode=h.mode,
            searched_at=h.searched_at,
        )
        for h in history
    ]
    return SearchHistoryResponse(history=items)


@router.delete("/history", status_code=204)
def clear_search_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Clear all search history.
    
    Returns 204 No Content on success.
    """
    SearchHistoryService.clear_history(db, str(current_user.id))


@router.get("/saved", response_model=SavedSearchesResponse)
def get_saved_searches(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Get all saved searches.
    
    Returns list of saved searches with their filters.
    """
    saved = SavedSearchService.get_all(db, str(current_user.id))
    items = [
        SavedSearchResponse(
            id=s.id,
            name=s.name,
            query=s.query,
            mode=s.mode,
            filters=s.filters,
            created_at=s.created_at,
        )
        for s in saved
    ]
    return SavedSearchesResponse(saved_searches=items)


@router.post("/saved", response_model=SavedSearchResponse, status_code=201)
def create_saved_search(
    request: SavedSearchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new saved search.
    
    Body: SavedSearchCreate with name, query, mode, and optional filters
    Returns the created saved search.
    """
    saved = SavedSearchService.create(
        db,
        user_id=str(current_user.id),
        name=request.name,
        query=request.query,
        mode=request.mode,
        filters=request.filters,
    )
    return SavedSearchResponse(
        id=saved.id,
        name=saved.name,
        query=saved.query,
        mode=saved.mode,
        filters=saved.filters,
        created_at=saved.created_at,
    )


@router.delete("/saved/{search_id}", status_code=204)
def delete_saved_search(
    search_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a saved search by ID.
    
    Returns 204 No Content on success, 404 if not found.
    """
    success = SavedSearchService.delete(db, str(current_user.id), search_id)
    if not success:
        raise HTTPException(status_code=404, detail="Saved search not found")
