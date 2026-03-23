"""
Pydantic schemas for Explore / AI Discovery API.
"""

from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.schemas.content import ContentResponse
from app.schemas.search import SearchResultItem


class GraphNode(BaseModel):
    """Node in the content graph."""
    id: UUID
    title: str
    domain: str
    tags: List[str]
    x: Optional[float] = None
    y: Optional[float] = None


class GraphEdge(BaseModel):
    """Edge between nodes in the content graph."""
    source: UUID
    target: UUID
    weight: float


class GraphResponse(BaseModel):
    """Response for the content graph."""
    nodes: List[GraphNode]
    edges: List[GraphEdge]


class SimilarPairResponse(BaseModel):
    """Response for similar content pairs."""
    item_a: ContentResponse
    item_b: ContentResponse
    similarity: float
    shared_tags: List[str]


class SimilarPairsResponse(BaseModel):
    """Response for listing similar pairs."""
    pairs: List[SimilarPairResponse]


class ClusterResponse(BaseModel):
    """Response for content clusters."""
    label: str
    items: List[ContentResponse]
    centroid_tags: List[str]


class ClustersResponse(BaseModel):
    """Response for listing clusters."""
    clusters: List[ClusterResponse]


class ForgottonItemsResponse(BaseModel):
    """Response for forgotten items."""
    items: List[ContentResponse]


class SimilarItemsResponse(BaseModel):
    """Response for similar items."""
    items: List[SearchResultItem]
