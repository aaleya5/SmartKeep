"""
Explore Service for AI-powered content discovery.

Provides:
- Graph visualization of content relationships
- Similar content pairs
- Content clusters
- Forgotten items discovery
- Similar items for a given content
"""

import logging
from typing import Dict, Any, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from app.models.content import Content
from app.models.annotation import Annotation
from app.services.embedding_service import embedding_service
from app.core.config import settings
from datetime import datetime, timedelta
from uuid import UUID
import json

logger = logging.getLogger(__name__)


class ExploreService:
    """Service for content exploration and AI discovery."""
    
    @staticmethod
    def get_content_graph(
        db: Session,
        limit: int = 50,
        min_similarity: float = 0.6
    ) -> Dict[str, Any]:
        """
        Get content graph with nodes and edges based on similarity.
        
        Args:
            db: Database session
            limit: Maximum nodes (capped at 100)
            min_similarity: Minimum similarity threshold
            
        Returns:
            Dictionary with nodes and edges
        """
        # Cap limit at 100
        limit = min(limit, 100)
        
        # Get content with embeddings
        content_items = db.query(Content).filter(
            Content.embedding.isnot(None),
            Content.enrichment_status == 'complete'
        ).order_by(Content.created_at.desc()).limit(limit).all()
        
        if not content_items:
            return {'nodes': [], 'edges': []}
        
        # Build nodes
        nodes = []
        content_by_id = {}
        for c in content_items:
            nodes.append({
                'id': c.id,
                'title': c.title,
                'domain': c.domain,
                'tags': c.tags or [],
            })
            content_by_id[str(c.id)] = c
        
        # Compute similarity edges
        edges = []
        n = len(content_items)
        
        for i in range(n):
            for j in range(i + 1, n):
                c1 = content_items[i]
                c2 = content_items[j]
                
                if c1.embedding and c2.embedding:
                    # Compute cosine similarity
                    similarity = ExploreService._cosine_similarity(
                        c1.embedding, c2.embedding
                    )
                    
                    if similarity >= min_similarity:
                        edges.append({
                            'source': c1.id,
                            'target': c2.id,
                            'weight': round(similarity, 3)
                        })
        
        return {
            'nodes': nodes,
            'edges': edges
        }
    
    @staticmethod
    def _cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
        """Compute cosine similarity between two vectors."""
        if not vec1 or not vec2 or len(vec1) != len(vec2):
            return 0.0
        
        dot = sum(a * b for a, b in zip(vec1, vec2))
        mag1 = sum(a * a for a in vec1) ** 0.5
        mag2 = sum(b * b for b in vec2) ** 0.5
        
        if mag1 == 0 or mag2 == 0:
            return 0.0
        
        return dot / (mag1 * mag2)
    
    @staticmethod
    def get_similar_pairs(
        db: Session,
        limit: int = 10,
        min_similarity: float = 0.75
    ) -> List[Dict[str, Any]]:
        """
        Find top-N most similar pairs of content.
        
        Args:
            db: Database session
            limit: Number of pairs to return
            min_similarity: Minimum similarity threshold
            
        Returns:
            List of similar pairs with content and similarity score
        """
        # Get content with embeddings
        content_items = db.query(Content).filter(
            Content.embedding.isnot(None),
            Content.enrichment_status == 'complete'
        ).all()
        
        if not content_items:
            return []
        
        # Compute all pairs and sort by similarity
        pairs = []
        n = len(content_items)
        
        for i in range(n):
            for j in range(i + 1, n):
                c1 = content_items[i]
                c2 = content_items[j]
                
                if c1.embedding and c2.embedding:
                    similarity = ExploreService._cosine_similarity(
                        c1.embedding, c2.embedding
                    )
                    
                    if similarity >= min_similarity:
                        # Find shared tags
                        tags1 = set(c1.tags or [])
                        tags2 = set(c2.tags or [])
                        shared = list(tags1 & tags2)
                        
                        pairs.append({
                            'item_a': c1,
                            'item_b': c2,
                            'similarity': round(similarity, 3),
                            'shared_tags': shared
                        })
        
        # Sort by similarity and limit
        pairs.sort(key=lambda x: x['similarity'], reverse=True)
        return pairs[:limit]
    
    @staticmethod
    def get_clusters(
        db: Session,
        num_clusters: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Group content by dominant tags (simple clustering).
        
        For a more sophisticated approach, could use k-means on embeddings.
        
        Args:
            db: Database session
            num_clusters: Number of clusters to create
            
        Returns:
            List of clusters with label, items, and centroid tags
        """
        # Get all content with tags
        content_items = db.query(Content).filter(
            Content.tags.isnot(None),
            func.array_length(Content.tags, 1) > 0
        ).all()
        
        if not content_items:
            return []
        
        # Group by tag combinations
        tag_groups: Dict[Tuple[str, ...], List[Content]] = {}
        
        for c in content_items:
            tags = c.tags or []
            if tags:
                # Use sorted tuple of tags as key
                key = tuple(sorted(tags[:3]))  # Use first 3 tags
                if key not in tag_groups:
                    tag_groups[key] = []
                tag_groups[key].append(c)
        
        # Sort by group size and take top clusters
        sorted_groups = sorted(
            tag_groups.items(),
            key=lambda x: len(x[1]),
            reverse=True
        )
        
        clusters = []
        for tags, items in sorted_groups[:num_clusters]:
            # Generate label from tags
            label = " & ".join([t.title() for t in tags[:2]])
            if len(tags) > 2:
                label += f" +{len(tags) - 2}"
            
            # Get centroid tags (most common)
            all_tags = []
            for item in items:
                all_tags.extend(item.tags or [])
            
            tag_counts: Dict[str, int] = {}
            for tag in all_tags:
                tag_counts[tag] = tag_counts.get(tag, 0) + 1
            
            centroid_tags = sorted(tag_counts.keys(), key=lambda x: tag_counts[x], reverse=True)[:5]
            
            clusters.append({
                'label': label,
                'items': items[:10],  # Limit items per cluster
                'centroid_tags': centroid_tags
            })
        
        return clusters
    
    @staticmethod
    def get_forgotten_items(
        db: Session,
        days_ago: int = 60,
        limit: int = 10
    ) -> List[Content]:
        """
        Get items older than days_ago that were never opened and have no annotations.
        
        Args:
            db: Database session
            days_ago: Number of days to look back
            limit: Maximum items to return
            
        Returns:
            List of forgotten content items
        """
        threshold_date = datetime.utcnow() - timedelta(days=days_ago)
        
        # Get content IDs that have annotations
        annotated_ids = db.query(Annotation.content_id).distinct().subquery()
        
        # Get content that's old, never opened, and not annotated
        forgotten = db.query(Content).filter(
            Content.created_at < threshold_date,
            Content.last_opened_at.is_(None),
            ~Content.id.in_(annotated_ids)
        ).order_by(Content.created_at.asc()).limit(limit).all()
        
        return forgotten
    
    @staticmethod
    def get_similar_items(
        db: Session,
        content_id: UUID,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Find similar items based on embedding similarity.
        
        Args:
            db: Database session
            content_id: ID of the content to find similar items for
            limit: Maximum items to return
            
        Returns:
            List of similar items with similarity scores
        """
        # Get the source content
        source = db.query(Content).filter(Content.id == content_id).first()
        
        if not source:
            return []
        
        if not source.embedding:
            return []
        
        # Generate embedding string
        embedding_string = '[' + ','.join(str(v) for v in source.embedding) + ']'
        
        # Query for similar items using pgvector
        sql = text("""
            SELECT 
                id, title, source_url, domain, body, tags,
                enrichment_status, summary, suggested_tags,
                word_count, difficulty, readability_score,
                is_truncated, is_read, reading_progress,
                enrichment_status, published_at, last_opened_at,
                created_at, updated_at,
                1 - (embedding <=> :embedding::vector) as similarity
            FROM content
            WHERE id != :content_id
              AND embedding IS NOT NULL
              AND array_length(embedding, 1) = :dim
            ORDER BY embedding <=> :embedding2::vector
            LIMIT :limit
        """)
        
        result = db.execute(sql, {
            'embedding': embedding_string,
            'embedding2': embedding_string,
            'content_id': str(content_id),
            'dim': settings.EMBEDDING_DIMENSION,
            'limit': limit
        })
        
        rows = result.fetchall()
        
        items = []
        for row in rows:
            items.append({
                'id': row.id,
                'source_url': row.source_url,
                'domain': row.domain,
                'title': row.title,
                'summary': row.summary,
                'tags': row.tags or [],
                'suggested_tags': row.suggested_tags or [],
                'word_count': row.word_count,
                'reading_time_minutes': (row.word_count // 200) if row.word_count else 0,
                'difficulty': row.difficulty,
                'readability_score': row.readability_score,
                'is_truncated': row.is_truncated,
                'is_read': row.is_read,
                'reading_progress': row.reading_progress,
                'enrichment_status': row.enrichment_status,
                'published_at': row.published_at,
                'last_opened_at': row.last_opened_at,
                'created_at': row.created_at,
                'updated_at': row.updated_at,
                'similarity_score': float(row.similarity) if row.similarity else 0.0,
            })
        
        return items


# Singleton instance
explore_service = ExploreService()
