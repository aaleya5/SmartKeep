"""
Content Search Service

Provides unified search for Content model using:
1. PostgreSQL Full-Text Search (keyword)
2. pgvector semantic search (semantic)
3. Hybrid search combining both (hybrid)
"""

import time
import logging
from typing import Dict, Any, List, Tuple, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from app.models.content import Content
from app.models.search import SearchHistory, SavedSearch
from app.services.embedding_service import embedding_service
from app.core.config import settings
from datetime import datetime
from uuid import UUID
import json

logger = logging.getLogger(__name__)


class ContentSearchService:
    """Service for searching content using keyword, semantic, or hybrid search."""
    
    BM25_WEIGHT = 0.4
    SEMANTIC_WEIGHT = 0.6
    
    def __init__(self, db: Session):
        self.db = db
    
    def keyword_search(
        self,
        query: str,
        limit: int = 20,
        offset: int = 0,
        tags: List[str] = None,
        domain: str = None,
        date_from: datetime = None,
        date_to: datetime = None,
        difficulty: str = None,
    ) -> Dict[str, Any]:
        """
        Keyword search using PostgreSQL full-text search.
        
        Returns results with ts_rank for relevance and ts_headline for excerpts.
        """
        start_time = time.time()
        
        # Build the query with ts_rank and ts_headline
        sql_parts = [
            """
            SELECT c.*, 
                   ts_rank(c.search_vector, plainto_tsquery('english', :query)) as relevance_score,
                   ts_headline('english', COALESCE(c.body, ''), plainto_tsquery('english', :query), 
                               'MaxWords=30, MinWords=15, StartSel=<b>, StopSel=</b>') as matched_excerpt
            FROM content c
            WHERE c.search_vector IS NOT NULL
              AND c.search_vector @@ plainto_tsquery('english', :query)
            """
        ]
        params = {'query': query, 'limit': limit, 'offset': offset}
        
        # Add filters
        if tags and len(tags) > 0:
            # Filter for items containing ALL tags
            for i, tag in enumerate(tags):
                sql_parts.append(f"AND c.tags @> :tags{i}")
                params[f'tags{i}'] = json.dumps([tag])
        
        if domain:
            sql_parts.append("AND c.domain = :domain")
            params['domain'] = domain
        
        if date_from:
            sql_parts.append("AND c.created_at >= :date_from")
            params['date_from'] = date_from
        
        if date_to:
            sql_parts.append("AND c.created_at <= :date_to")
            params['date_to'] = date_to
        
        if difficulty:
            sql_parts.append("AND c.difficulty = :difficulty")
            params['difficulty'] = difficulty
        
        sql_parts.append("ORDER BY relevance_score DESC LIMIT :limit OFFSET :offset")
        
        sql = ' '.join(sql_parts)
        result = self.db.execute(text(sql), params)
        rows = result.fetchall()
        
        # Get total count
        count_sql = """
            SELECT COUNT(*) as total
            FROM content c
            WHERE c.search_vector IS NOT NULL
              AND c.search_vector @@ plainto_tsquery('english', :query)
        """
        count_params = {'query': query}
        
        if tags and len(tags) > 0:
            count_sql += f" AND c.tags @> :tags0"
            count_params['tags0'] = json.dumps([tags[0]])
        if domain:
            count_sql += " AND c.domain = :domain"
            count_params['domain'] = domain
        if date_from:
            count_sql += " AND c.created_at >= :date_from"
            count_params['date_from'] = date_from
        if date_to:
            count_sql += " AND c.created_at <= :date_to"
            count_params['date_to'] = date_to
        if difficulty:
            count_sql += " AND c.difficulty = :difficulty"
            count_params['difficulty'] = difficulty
        
        total_result = self.db.execute(text(count_sql), count_params)
        total = total_result.fetchone().total
        
        elapsed_time = time.time() - start_time
        
        # Convert to content objects with scores
        items = []
        for row in rows:
            content = self._row_to_content_dict(row)
            content['relevance_score'] = float(row.relevance_score) if row.relevance_score else 0.0
            content['matched_excerpt'] = row.matched_excerpt
            items.append(content)
        
        return {
            'items': items,
            'total': total,
            'latency_ms': elapsed_time * 1000,
        }
    
    def semantic_search(
        self,
        query: str,
        limit: int = 20,
        offset: int = 0,
        tags: List[str] = None,
        domain: str = None,
        date_from: datetime = None,
        date_to: datetime = None,
        difficulty: str = None,
    ) -> Dict[str, Any]:
        """
        Semantic search using pgvector cosine similarity.
        """
        start_time = time.time()
        
        # Generate embedding for the query
        query_embedding = embedding_service.embed(query)
        embedding_string = '[' + ','.join(str(v) for v in query_embedding) + ']'
        
        # Build the query
        sql_parts = [
            f"""
            SELECT c.*, 
                   1 - (c.embedding <=> :embedding::vector) as similarity_score
            FROM content c
            WHERE c.embedding IS NOT NULL
              AND array_length(c.embedding, 1) = {settings.EMBEDDING_DIMENSION}
            """
        ]
        params = {'embedding': embedding_string, 'limit': limit, 'offset': offset}
        
        # Add filters
        if tags and len(tags) > 0:
            for i, tag in enumerate(tags):
                sql_parts.append(f"AND c.tags @> :tags{i}")
                params[f'tags{i}'] = json.dumps([tag])
        
        if domain:
            sql_parts.append("AND c.domain = :domain")
            params['domain'] = domain
        
        if date_from:
            sql_parts.append("AND c.created_at >= :date_from")
            params['date_from'] = date_from
        
        if date_to:
            sql_parts.append("AND c.created_at <= :date_to")
            params['date_to'] = date_to
        
        if difficulty:
            sql_parts.append("AND c.difficulty = :difficulty")
            params['difficulty'] = difficulty
        
        sql_parts.append("ORDER BY c.embedding <=> :embedding2::vector LIMIT :limit OFFSET :offset")
        params['embedding2'] = embedding_string
        
        sql = ' '.join(sql_parts)
        
        try:
            result = self.db.execute(text(sql), params)
            rows = result.fetchall()
        except Exception as e:
            logger.error(f"Semantic search error: {e}")
            return {
                'items': [],
                'total': 0,
                'latency_ms': (time.time() - start_time) * 1000,
            }
        
        # Get total count
        count_sql = """
            SELECT COUNT(*) as total
            FROM content c
            WHERE c.embedding IS NOT NULL
              AND array_length(c.embedding, 1) = :dim
        """
        count_params = {'dim': settings.EMBEDDING_DIMENSION}
        
        if tags and len(tags) > 0:
            count_sql += f" AND c.tags @> :tags0"
            count_params['tags0'] = json.dumps([tags[0]])
        if domain:
            count_sql += " AND c.domain = :domain"
            count_params['domain'] = domain
        if date_from:
            count_sql += " AND c.created_at >= :date_from"
            count_params['date_from'] = date_from
        if date_to:
            count_sql += " AND c.created_at <= :date_to"
            count_params['date_to'] = date_to
        if difficulty:
            count_sql += " AND c.difficulty = :difficulty"
            count_params['difficulty'] = difficulty
        
        total_result = self.db.execute(text(count_sql), count_params)
        total = total_result.fetchone().total
        
        elapsed_time = time.time() - start_time
        
        items = []
        for row in rows:
            content = self._row_to_content_dict(row)
            content['similarity_score'] = float(row.similarity_score) if row.similarity_score else 0.0
            items.append(content)
        
        return {
            'items': items,
            'total': total,
            'latency_ms': elapsed_time * 1000,
        }
    
    def hybrid_search(
        self,
        query: str,
        limit: int = 20,
        offset: int = 0,
        tags: List[str] = None,
        domain: str = None,
        date_from: datetime = None,
        date_to: datetime = None,
        difficulty: str = None,
        bm25_weight: float = None,
        semantic_weight: float = None,
    ) -> Dict[str, Any]:
        """
        Hybrid search combining keyword and semantic search.
        
        Runs both searches, normalizes scores, and combines them.
        """
        if bm25_weight is None:
            bm25_weight = self.BM25_WEIGHT
        if semantic_weight is None:
            semantic_weight = self.SEMANTIC_WEIGHT
        
        # Normalize weights
        total_weight = bm25_weight + semantic_weight
        if total_weight > 0:
            bm25_weight = bm25_weight / total_weight
            semantic_weight = semantic_weight / total_weight
        
        start_time = time.time()
        
        # Get keyword results (more for merging)
        keyword_results = self.keyword_search(
            query, limit * 2, 0, tags, domain, date_from, date_to, difficulty
        )
        
        # Get semantic results (more for merging)
        semantic_results = self.semantic_search(
            query, limit * 2, 0, tags, domain, date_from, date_to, difficulty
        )
        
        # Build combined results
        results_dict = {}
        
        # Add keyword results
        max_keyword_score = max(
            (item.get('relevance_score', 0) for item in keyword_results['items']),
            default=1
        )
        for item in keyword_results['items']:
            content_id = str(item['id'])
            normalized_score = item.get('relevance_score', 0) / max_keyword_score if max_keyword_score > 0 else 0
            results_dict[content_id] = {
                'item': item,
                'keyword_score': normalized_score,
                'semantic_score': 0,
            }
        
        # Add semantic results
        max_semantic_score = max(
            (item.get('similarity_score', 0) for item in semantic_results['items']),
            default=1
        )
        for item in semantic_results['items']:
            content_id = str(item['id'])
            normalized_score = item.get('similarity_score', 0) / max_semantic_score if max_semantic_score > 0 else 0
            if content_id in results_dict:
                results_dict[content_id]['semantic_score'] = normalized_score
            else:
                results_dict[content_id] = {
                    'item': item,
                    'keyword_score': 0,
                    'semantic_score': normalized_score,
                }
        
        # Calculate combined scores
        combined_results = []
        for content_id, scores in results_dict.items():
            combined_score = (
                bm25_weight * scores['keyword_score'] +
                semantic_weight * scores['semantic_score']
            )
            item = scores['item']
            item['relevance_score'] = scores['keyword_score']
            item['similarity_score'] = scores['semantic_score']
            item['combined_score'] = combined_score
            combined_results.append(item)
        
        # Sort by combined score
        combined_results.sort(key=lambda x: x.get('combined_score', 0), reverse=True)
        
        # Apply pagination
        total = len(combined_results)
        paginated_results = combined_results[offset:offset + limit]
        
        elapsed_time = time.time() - start_time
        
        return {
            'items': paginated_results,
            'total': total,
            'latency_ms': elapsed_time * 1000,
        }
    
    def search(
        self,
        query: str,
        mode: str = 'hybrid',
        limit: int = 20,
        offset: int = 0,
        tags: List[str] = None,
        domain: str = None,
        date_from: datetime = None,
        date_to: datetime = None,
        difficulty: str = None,
    ) -> Dict[str, Any]:
        """Main search method that dispatches to the appropriate search type."""
        
        if mode == 'keyword':
            return self.keyword_search(query, limit, offset, tags, domain, date_from, date_to, difficulty)
        elif mode == 'semantic':
            return self.semantic_search(query, limit, offset, tags, domain, date_from, date_to, difficulty)
        else:  # hybrid
            return self.hybrid_search(query, limit, offset, tags, domain, date_from, date_to, difficulty)
    
    def get_suggestions(self, prefix: str, limit: int = 5) -> List[str]:
        """Get title autocomplete suggestions based on prefix."""
        if len(prefix) < 2:
            return []
        
        sql = """
            SELECT DISTINCT title
            FROM content
            WHERE title ILIKE :prefix
            ORDER BY title
            LIMIT :limit
        """
        result = self.db.execute(text(sql), {'prefix': f'%{prefix}%', 'limit': limit})
        return [row.title for row in result.fetchall()]
    
    def _row_to_content_dict(self, row) -> dict:
        """Convert a SQLAlchemy row to a content dictionary."""
        return {
            'id': str(row.id),
            'source_url': row.source_url,
            'domain': row.domain,
            'og_image_url': row.og_image_url,
            'favicon_url': row.favicon_url,
            'title': row.title,
            'author': row.author,
            'summary': row.summary,
            'suggested_tags': row.suggested_tags or [],
            'tags': row.tags or [],
            'notes': row.notes,
            'word_count': row.word_count,
            'reading_time_minutes': (row.word_count // 200) if row.word_count else 0,
            'difficulty': row.difficulty,
            'readability_score': row.readability_score,
            'is_truncated': row.is_truncated,
            'is_read': row.is_read,
            'reading_progress': row.reading_progress,
            'enrichment_status': row.enrichment_status,
            'published_at': row.published_at.isoformat() if row.published_at else None,
            'last_opened_at': row.last_opened_at.isoformat() if row.last_opened_at else None,
            'created_at': row.created_at.isoformat() if row.created_at else None,
            'updated_at': row.updated_at.isoformat() if row.updated_at else None,
        }


class SearchHistoryService:
    """Service for managing search history."""
    
    @staticmethod
    def add_history(db: Session, query: str, mode: str, result_count: int) -> SearchHistory:
        """Add a search query to history."""
        history = SearchHistory(
            query=query,
            mode=mode,
            result_count=result_count,
        )
        db.add(history)
        db.commit()
        return history
    
    @staticmethod
    def get_history(db: Session, limit: int = 20) -> List[SearchHistory]:
        """Get recent search history."""
        return db.query(SearchHistory).order_by(
            SearchHistory.searched_at.desc()
        ).limit(limit).all()
    
    @staticmethod
    def clear_history(db: Session) -> int:
        """Clear all search history."""
        deleted = db.query(SearchHistory).delete()
        db.commit()
        return deleted


class SavedSearchService:
    """Service for managing saved searches."""
    
    @staticmethod
    def create(db: Session, name: str, query: str, mode: str = 'hybrid', 
               filters: dict = None) -> SavedSearch:
        """Create a new saved search."""
        saved = SavedSearch(
            name=name,
            query=query,
            mode=mode,
            filters=filters or {},
        )
        db.add(saved)
        db.commit()
        return saved
    
    @staticmethod
    def get_all(db: Session) -> List[SavedSearch]:
        """Get all saved searches."""
        return db.query(SavedSearch).order_by(SavedSearch.created_at.desc()).all()
    
    @staticmethod
    def delete(db: Session, search_id: UUID) -> bool:
        """Delete a saved search."""
        deleted = db.query(SavedSearch).filter(SavedSearch.id == search_id).delete()
        db.commit()
        return deleted > 0
