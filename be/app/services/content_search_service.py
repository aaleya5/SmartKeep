"""
Content Search Service

Provides unified search for Content model using:
1. PostgreSQL Full-Text Search (keyword)
2. pgvector semantic search (semantic)
3. Hybrid search combining both (hybrid) using RRF
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
    
    # RRF (Reciprocal Rank Fusion) parameters
    RRF_K = 60
    
    def __init__(self, db: Session, user_id: str):
        self.db = db
        self.user_id = user_id
    
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
            WHERE c.user_id = :user_id
              AND c.search_vector IS NOT NULL
              AND c.search_vector @@ plainto_tsquery('english', :query)
            """
        ]
        params = {'query': query, 'limit': limit, 'offset': offset, 'user_id': self.user_id}
        
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
        
        sql_parts.append("ORDER BY relevance_score DESC LIMIT :limit OFFSET :offset")
        
        sql = ' '.join(sql_parts)
        result = self.db.execute(text(sql), params)
        rows = result.fetchall()
        
        # Get total count
        count_sql = """
            SELECT COUNT(*) as total
            FROM content c
            WHERE c.user_id = :user_id
              AND c.search_vector IS NOT NULL
              AND c.search_vector @@ plainto_tsquery('english', :query)
        """
        count_params = {'query': query, 'user_id': self.user_id}
        
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
                   1 - (c.embedding\:\:vector <=> :embedding\:\:vector) as similarity_score
            FROM content c
            WHERE c.user_id = :user_id
              AND c.embedding IS NOT NULL
              AND array_length(c.embedding, 1) = {settings.EMBEDDING_DIMENSION}
            """
        ]
        params = {'embedding': embedding_string, 'limit': limit, 'offset': offset, 'user_id': self.user_id}
        
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
        
        sql_parts.append("ORDER BY c.embedding\:\:vector <=> :embedding2\:\:vector LIMIT :limit OFFSET :offset")
        params['embedding2'] = embedding_string
        
        sql = ' '.join(sql_parts)
        
        try:
            result = self.db.execute(text(sql), params)
            rows = result.fetchall()
        except Exception as e:
            logger.error(f"Semantic search error: {e}")
            self.db.rollback()
            return {
                'items': [],
                'total': 0,
                'latency_ms': (time.time() - start_time) * 1000,
            }
        
        # Get total count
        count_sql = """
            SELECT COUNT(*) as total
            FROM content c
            WHERE c.user_id = :user_id
              AND c.embedding IS NOT NULL
              AND array_length(c.embedding, 1) = :dim
        """
        count_params = {'dim': settings.EMBEDDING_DIMENSION, 'user_id': self.user_id}
        
        # Apply filters to count query as well
        if tags and len(tags) > 0:
            for i, tag in enumerate(tags):
                count_sql += f" AND c.tags @> :tags{i}"
                count_params[f'tags{i}'] = json.dumps([tag])
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
            # For semantic search, generate a simple excerpt if body exists
            if row.body:
                body_lower = row.body.lower()
                query_words = query.lower().split()
                first_match = -1
                for word in query_words:
                    idx = body_lower.find(word)
                    if idx != -1:
                        first_match = idx
                        break
                
                if first_match != -1:
                    start = max(0, first_match - 60)
                    end = min(len(row.body), first_match + 100)
                    content['matched_excerpt'] = (row.body[start:end] + "...") if end < len(row.body) else row.body[start:end]
            
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
    ) -> Dict[str, Any]:
        """
        Hybrid search using Reciprocal Rank Fusion (RRF).
        
        RRF combines rankings from multiple search engines without needing normalized scores.
        formula: score(d) = sum_{r in rankings} 1 / (k + rank(d, r))
        """
        start_time = time.time()
        
        # Get more results from each to have a good pool for fusion
        # Using limit * 3 as a heuristic for fusion pool
        pool_limit = max(100, limit * 3)
        
        keyword_results = self.keyword_search(
            query, pool_limit, 0, tags, domain, date_from, date_to, difficulty
        )
        
        semantic_results = self.semantic_search(
            query, pool_limit, 0, tags, domain, date_from, date_to, difficulty
        )
        
        # Fusion logic (RRF)
        rrf_scores = {} # doc_id -> score
        doc_map = {}    # doc_id -> item_dict
        
        # Process keyword ranks
        for i, item in enumerate(keyword_results['items']):
            doc_id = item['id']
            rank = i + 1
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0) + (1.0 / (self.RRF_K + rank))
            doc_map[doc_id] = item
            doc_map[doc_id]['relevance_score'] = item.get('relevance_score', 0)
            
        # Process semantic ranks
        for i, item in enumerate(semantic_results['items']):
            doc_id = item['id']
            rank = i + 1
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0) + (1.0 / (self.RRF_K + rank))
            
            if doc_id in doc_map:
                # Merge semantic info into existing keyword doc
                doc_map[doc_id]['similarity_score'] = item.get('similarity_score', 0)
                # Prefer semantic excerpt if keyword one is missing
                if not doc_map[doc_id].get('matched_excerpt') and item.get('matched_excerpt'):
                    doc_map[doc_id]['matched_excerpt'] = item['matched_excerpt']
            else:
                doc_map[doc_id] = item
                doc_map[doc_id]['similarity_score'] = item.get('similarity_score', 0)
                doc_map[doc_id]['relevance_score'] = 0
        
        # Sort by RRF score
        fused_results = []
        for doc_id, score in rrf_scores.items():
            item = doc_map[doc_id]
            item['combined_score'] = score
            fused_results.append(item)
            
        fused_results.sort(key=lambda x: x['combined_score'], reverse=True)
        
        # Paginate
        total = len(fused_results)
        paginated_results = fused_results[offset : offset + limit]
        
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
            WHERE user_id = :user_id
              AND title ILIKE :prefix
            ORDER BY title
            LIMIT :limit
        """
        result = self.db.execute(text(sql), {
            'user_id': self.user_id,
            'prefix': f'%{prefix}%', 
            'limit': limit
        })
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
    def add_history(db: Session, user_id: str, query: str, mode: str, result_count: int) -> SearchHistory:
        """Add a search query to history."""
        history = SearchHistory(
            user_id=user_id,
            query=query,
            mode=mode,
            result_count=result_count,
        )
        db.add(history)
        db.commit()
        return history
    
    @staticmethod
    def get_history(db: Session, user_id: str, limit: int = 20) -> List[SearchHistory]:
        """Get recent search history."""
        return db.query(SearchHistory).filter(
            SearchHistory.user_id == user_id
        ).order_by(
            SearchHistory.searched_at.desc()
        ).limit(limit).all()
    
    @staticmethod
    def clear_history(db: Session, user_id: str) -> int:
        """Clear all search history."""
        deleted = db.query(SearchHistory).filter(
            SearchHistory.user_id == user_id
        ).delete()
        db.commit()
        return deleted


class SavedSearchService:
    """Service for managing saved searches."""
    
    @staticmethod
    def create(db: Session, user_id: str, name: str, query: str, mode: str = 'hybrid', 
               filters: dict = None) -> SavedSearch:
        """Create a new saved search."""
        saved = SavedSearch(
            user_id=user_id,
            name=name,
            query=query,
            mode=mode,
            filters=filters or {},
        )
        db.add(saved)
        db.commit()
        return saved
    
    @staticmethod
    def get_all(db: Session, user_id: str) -> List[SavedSearch]:
        """Get all saved searches."""
        return db.query(SavedSearch).filter(
            SavedSearch.user_id == user_id
        ).order_by(
            SavedSearch.created_at.desc()
        ).all()
    
    @staticmethod
    def delete(db: Session, user_id: str, search_id: UUID) -> bool:
        """Delete a saved search."""
        deleted = db.query(SavedSearch).filter(
            SavedSearch.id == search_id,
            SavedSearch.user_id == user_id
        ).delete()
        db.commit()
        return deleted > 0
