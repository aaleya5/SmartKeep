"""
Explore / AI Discovery API endpoints.

Provides endpoints for:
- Content graph visualization
- Similar content pairs
- Content clusters
- Forgotten items discovery
- Similar items for a given content
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from uuid import UUID

from app.db.session import get_db
from app.schemas.explore import (
    GraphResponse,
    GraphNode,
    GraphEdge,
    SimilarPairsResponse,
    SimilarPairResponse,
    ClustersResponse,
    ClusterResponse,
    ForgottonItemsResponse,
    SimilarItemsResponse,
)
from app.schemas.content import ContentResponse
from app.schemas.search import SearchResultItem
from app.services.explore_service import explore_service


router = APIRouter(prefix="/explore", tags=["Explore"])


@router.get("/graph", response_model=GraphResponse)
def get_content_graph(
    limit: int = Query(50, ge=1, le=100, description="Maximum nodes"),
    min_similarity: float = Query(0.6, ge=0.0, le=1.0, description="Minimum similarity"),
    db: Session = Depends(get_db)
):
    """
    Get content graph with nodes and edges.
    
    Fetches content items with embeddings and computes cosine similarities.
    Returns nodes and edges for visualization.
    """
    data = explore_service.get_content_graph(db, limit=limit, min_similarity=min_similarity)
    
    nodes = [GraphNode(**n) for n in data['nodes']]
    edges = [GraphEdge(**e) for e in data['edges']]
    
    return GraphResponse(nodes=nodes, edges=edges)


@router.get("/similar-pairs", response_model=SimilarPairsResponse)
def get_similar_pairs(
    limit: int = Query(10, ge=1, le=50, description="Number of pairs"),
    min_similarity: float = Query(0.75, ge=0.0, le=1.0, description="Minimum similarity"),
    db: Session = Depends(get_db)
):
    """
    Find top-N most similar pairs of content.
    
    Returns pairs with similarity score and shared tags.
    """
    pairs = explore_service.get_similar_pairs(db, limit=limit, min_similarity=min_similarity)
    
    result_pairs = []
    for p in pairs:
        result_pairs.append(SimilarPairResponse(
            item_a=ContentResponse(
                id=p['item_a'].id,
                source_url=p['item_a'].source_url,
                domain=p['item_a'].domain,
                title=p['item_a'].title,
                tags=p['item_a'].tags or [],
                suggested_tags=p['item_a'].suggested_tags or [],
                word_count=p['item_a'].word_count,
                reading_time_minutes=p['item_a'].reading_time_minutes,
                enrichment_status=p['item_a'].enrichment_status,
                created_at=p['item_a'].created_at,
                updated_at=p['item_a'].updated_at,
            ),
            item_b=ContentResponse(
                id=p['item_b'].id,
                source_url=p['item_b'].source_url,
                domain=p['item_b'].domain,
                title=p['item_b'].title,
                tags=p['item_b'].tags or [],
                suggested_tags=p['item_b'].suggested_tags or [],
                word_count=p['item_b'].word_count,
                reading_time_minutes=p['item_b'].reading_time_minutes,
                enrichment_status=p['item_b'].enrichment_status,
                created_at=p['item_b'].created_at,
                updated_at=p['item_b'].updated_at,
            ),
            similarity=p['similarity'],
            shared_tags=p['shared_tags'],
        ))
    
    return SimilarPairsResponse(pairs=result_pairs)


@router.get("/clusters", response_model=ClustersResponse)
def get_clusters(
    db: Session = Depends(get_db)
):
    """
    Group content by dominant tags.
    
    Simple clustering approach: items sharing 2+ tags form a cluster.
    """
    clusters = explore_service.get_clusters(db, num_clusters=5)
    
    result_clusters = []
    for c in clusters:
        items = [
            ContentResponse(
                id=item.id,
                source_url=item.source_url,
                domain=item.domain,
                title=item.title,
                tags=item.tags or [],
                suggested_tags=item.suggested_tags or [],
                word_count=item.word_count,
                reading_time_minutes=item.reading_time_minutes,
                enrichment_status=item.enrichment_status,
                created_at=item.created_at,
                updated_at=item.updated_at,
            )
            for item in c['items']
        ]
        
        result_clusters.append(ClusterResponse(
            label=c['label'],
            items=items,
            centroid_tags=c['centroid_tags'],
        ))
    
    return ClustersResponse(clusters=result_clusters)


@router.get("/forgotten", response_model=ForgottonItemsResponse)
def get_forgotten_items(
    days_ago: int = Query(60, ge=1, le=365, description="Days to look back"),
    limit: int = Query(10, ge=1, le=50, description="Maximum items"),
    db: Session = Depends(get_db)
):
    """
    Get items older than days_ago that were never opened and have no annotations.
    
    Useful for rediscovering old content.
    """
    items = explore_service.get_forgotten_items(db, days_ago=days_ago, limit=limit)
    
    result_items = [
        ContentResponse(
            id=item.id,
            source_url=item.source_url,
            domain=item.domain,
            title=item.title,
            tags=item.tags or [],
            suggested_tags=item.suggested_tags or [],
            word_count=item.word_count,
            reading_time_minutes=item.reading_time_minutes,
            enrichment_status=item.enrichment_status,
            created_at=item.created_at,
            updated_at=item.updated_at,
        )
        for item in items
    ]
    
    return ForgottonItemsResponse(items=result_items)


@router.get("/similar/{content_id}", response_model=SimilarItemsResponse)
def get_similar_items(
    content_id: UUID,
    limit: int = Query(5, ge=1, le=20, description="Maximum similar items"),
    db: Session = Depends(get_db)
):
    """
    Find similar items for a given content.
    
    Used in the Reader page "Related content" sidebar.
    Returns 404 if content not found, 400 if no embedding available.
    """
    # Check if content exists
    from app.services.content_service import ContentService
    content = ContentService.get_by_id(db, content_id)
    
    if not content:
        raise HTTPException(status_code=404, detail=f"Content {content_id} not found")
    
    if not content.embedding:
        raise HTTPException(
            status_code=400,
            detail="Content does not have an embedding yet. Please wait for enrichment to complete."
        )
    
    items = explore_service.get_similar_items(db, content_id, limit=limit)
    
    result_items = []
    for item in items:
        result_items.append(SearchResultItem(
            id=item['id'],
            source_url=item['source_url'],
            domain=item['domain'],
            title=item['title'],
            tags=item['tags'],
            suggested_tags=item['suggested_tags'],
            word_count=item['word_count'],
            reading_time_minutes=item['reading_time_minutes'],
            difficulty=item['difficulty'],
            enrichment_status=item['enrichment_status'],
            created_at=item['created_at'],
            updated_at=item['updated_at'],
            similarity_score=item['similarity_score'],
        ))
    
    return SimilarItemsResponse(items=result_items)
