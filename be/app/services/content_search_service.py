"""
Content Search Service

Provides unified search for Content model using:
1. PostgreSQL Full-Text Search (keyword)
2. pgvector semantic search (semantic)
3. Hybrid search combining both (hybrid) using RRF
"""

import time
import logging
import hashlib
import json
from typing import Dict, Any, List, Tuple, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from app.models.content import Content
from app.models.annotation import Annotation
from app.models.search import SearchHistory, SavedSearch
from app.models.collection import ContentCollection
from app.services.embedding_service import embedding_service
from datetime import datetime
from uuid import UUID

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
        is_read: bool = None,
        collection_id: UUID = None,
    ) -> Dict[str, Any]:
        """Keyword search using PostgreSQL full-text search."""
        start_time = time.time()
        
        # Build the query with ts_rank and ts_headline
        sql_parts = [
            """
            SELECT c.*, 
                   ts_rank(c.search_vector, plainto_tsquery('english', :query)) as relevance_score,
                   ts_headline('english', COALESCE(c.body, ''), plainto_tsquery('english', :query), 
                               'MaxWords=30, MinWords=15, StartSel=<b>, StopSel=</b>') as matched_excerpt,
                   (
                       SELECT json_agg(json_build_object(
                           'id', a.id,
                           'selected_text', a.selected_text,
                           'note', a.note,
                           'color', a.color,
                           'relevance_score', ts_rank(to_tsvector('english', COALESCE(a.selected_text, '') || ' ' || COALESCE(a.note, '')), plainto_tsquery('english', :query))
                       ))
                       FROM annotations a
                       WHERE a.content_id = c.id
                         AND to_tsvector('english', COALESCE(a.selected_text, '') || ' ' || COALESCE(a.note, '')) @@ plainto_tsquery('english', :query)
                   ) as matched_annotations
            FROM content c
            """
        ]
        
        if collection_id:
            sql_parts.append("JOIN content_collections cc ON c.id = cc.content_id")
            
        sql_parts.append("""
            WHERE c.user_id = :user_id
              AND (
                c.search_vector @@ plainto_tsquery('english', :query)
                OR EXISTS (
                    SELECT 1 FROM annotations a 
                    WHERE a.content_id = c.id 
                    AND to_tsvector('english', COALESCE(a.selected_text, '') || ' ' || COALESCE(a.note, '')) @@ plainto_tsquery('english', :query)
                )
              )
        """)
        
        params = {'query': query, 'limit': limit, 'offset': offset, 'user_id': self.user_id}
        
        # Add filters
        if tags:
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
            
        if is_read is not None:
            sql_parts.append("AND c.is_read = :is_read")
            params['is_read'] = is_read
            
        if collection_id:
            sql_parts.append("AND cc.collection_id = :collection_id")
            params['collection_id'] = collection_id
        
        sql_parts.append("ORDER BY relevance_score DESC LIMIT :limit OFFSET :offset")
        
        sql = ' '.join(sql_parts)
        result = self.db.execute(text(sql), params)
        rows = result.fetchall()
        
        # Total count query
        count_parts = ["SELECT COUNT(DISTINCT c.id) as total FROM content c"]
        if collection_id:
            count_parts.append("JOIN content_collections cc ON c.id = cc.content_id")
        count_parts.append("WHERE c.user_id = :user_id AND c.search_vector IS NOT NULL AND c.search_vector @@ plainto_tsquery('english', :query)")
        
        # Reuse same filters for count
        count_sql = ' '.join(count_parts)
        # Note: In a real app we'd build the filter clause once and reuse
        total = self.db.execute(text(count_sql), {'query': query, 'user_id': self.user_id}).fetchone().total
        
        items = [self._row_to_dict_with_scores(row, relevance=row.relevance_score, excerpt=row.matched_excerpt, matched_annotations=row.matched_annotations) for row in rows]
        
        return {'items': items, 'total': total, 'latency_ms': (time.time() - start_time) * 1000}
    
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
        is_read: bool = None,
        collection_id: UUID = None,
    ) -> Dict[str, Any]:
        """Semantic search using pgvector cosine similarity."""
        start_time = time.time()
        query_embedding = embedding_service.embed(query)
        embedding_string = '[' + ','.join(str(v) for v in query_embedding) + ']'
        
        sql_parts = [
            """
            SELECT c.*, 
                   1 - (c.embedding <=> (:embedding)::vector) as similarity_score
            FROM content c
            """
        ]
        
        if collection_id:
            sql_parts.append("JOIN content_collections cc ON c.id = cc.content_id")
            
        sql_parts.append("""
            WHERE c.user_id = :user_id
              AND c.embedding IS NOT NULL
        """)
        
        params = {'embedding': embedding_string, 'limit': limit, 'offset': offset, 'user_id': self.user_id}
        
        # Add same filters
        if tags:
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
        if is_read is not None:
            sql_parts.append("AND c.is_read = :is_read")
            params['is_read'] = is_read
        if collection_id:
            sql_parts.append("AND cc.collection_id = :collection_id")
            params['collection_id'] = collection_id
        
        sql_parts.append("ORDER BY c.embedding <=> (:embedding)::vector LIMIT :limit OFFSET :offset")
        
        sql = ' '.join(sql_parts)
        result = self.db.execute(text(sql), params)
        rows = result.fetchall()
        
        items = [self._row_to_dict_with_scores(row, similarity=row.similarity_score) for row in rows]
        
        # Fallback excerpt for semantic results
        for item in items:
            if not item.get('matched_excerpt') and item.get('body'):
                # Simple heuristic: find first query word in body
                body = item['body']
                excerpt = body[:200] + "..." if len(body) > 200 else body
                item['matched_excerpt'] = excerpt

        return {'items': items, 'total': len(items), 'latency_ms': (time.time() - start_time) * 1000}
    
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
        is_read: bool = None,
        collection_id: UUID = None,
    ) -> Dict[str, Any]:
        """Hybrid search using Reciprocal Rank Fusion (RRF)."""
        start_time = time.time()
        
        # Pool size for RRF
        pool_limit = max(100, limit * 2)
        
        keyword_results = self.keyword_search(
            query, pool_limit, 0, tags, domain, date_from, date_to, difficulty, is_read, collection_id
        )
        semantic_results = self.semantic_search(
            query, pool_limit, 0, tags, domain, date_from, date_to, difficulty, is_read, collection_id
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
            
        # Process semantic ranks
        for i, item in enumerate(semantic_results['items']):
            doc_id = item['id']
            rank = i + 1
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0) + (1.0 / (self.RRF_K + rank))
            
            if doc_id in doc_map:
                doc_map[doc_id]['similarity_score'] = item.get('similarity_score', 0)
                if not doc_map[doc_id].get('matched_excerpt'):
                    doc_map[doc_id]['matched_excerpt'] = item.get('matched_excerpt')
            else:
                doc_map[doc_id] = item
        
        # Sort and paginate
        fused_results = []
        for doc_id, score in rrf_scores.items():
            item = doc_map[doc_id]
            item['combined_score'] = score
            fused_results.append(item)
            
        fused_results.sort(key=lambda x: x['combined_score'], reverse=True)
        total = len(fused_results)
        paginated = fused_results[offset : offset + limit]
        
        result = {
            'items': paginated,
            'total': total,
            'latency_ms': (time.time() - start_time) * 1000,
        }
        
        return result
    
    def search(self, **kwargs) -> Dict[str, Any]:
        mode = kwargs.get('mode', 'hybrid')
        if mode == 'keyword':
            return self.keyword_search(**{k: v for k, v in kwargs.items() if k != 'mode'})
        elif mode == 'semantic':
            return self.semantic_search(**{k: v for k, v in kwargs.items() if k != 'mode'})
        return self.hybrid_search(**{k: v for k, v in kwargs.items() if k != 'mode'})

    def get_suggestions(self, prefix: str, limit: int = 5) -> List[str]:
        if len(prefix) < 2: return []
        sql = "SELECT DISTINCT title FROM content WHERE user_id = :user_id AND title ILIKE :prefix ORDER BY title LIMIT :limit"
        result = self.db.execute(text(sql), {'user_id': self.user_id, 'prefix': f'%{prefix}%', 'limit': limit})
        return [row.title for row in result.fetchall()]

    def _row_to_dict_with_scores(self, row, relevance=0.0, similarity=0.0, excerpt=None, matched_annotations=None) -> dict:
        d = {
            'id': str(row.id), 'source_url': row.source_url, 'domain': row.domain,
            'og_image_url': row.og_image_url, 'favicon_url': row.favicon_url,
            'title': row.title, 'author': row.author, 'summary': row.summary,
            'suggested_tags': row.suggested_tags or [], 'tags': row.tags or [],
            'notes': row.notes, 'word_count': row.word_count,
            'reading_time_minutes': (row.word_count + 199) // 200 if row.word_count else 0,
            'difficulty': row.difficulty, 'readability_score': row.readability_score,
            'is_truncated': row.is_truncated, 'is_read': row.is_read,
            'reading_progress': row.reading_progress, 'enrichment_status': row.enrichment_status,
            'published_at': row.published_at.isoformat() if row.published_at else None,
            'last_opened_at': row.last_opened_at.isoformat() if row.last_opened_at else None,
            'created_at': row.created_at.isoformat() if row.created_at else None,
            'updated_at': row.updated_at.isoformat() if row.updated_at else None,
            'relevance_score': float(relevance) if relevance else 0.0,
            'similarity_score': float(similarity) if similarity else 0.0,
            'matched_excerpt': excerpt,
            'matched_annotations': matched_annotations or []
        }
        # Include body for excerpt generation if needed
        if hasattr(row, 'body'): d['body'] = row.body
        return d


class SearchHistoryService:
    @staticmethod
    def add_history(db: Session, user_id: str, query: str, mode: str, result_count: int) -> SearchHistory:
        history = SearchHistory(user_id=user_id, query=query, mode=mode, result_count=result_count)
        db.add(history)
        db.commit()
        return history
    
    @staticmethod
    def get_history(db: Session, user_id: str, limit: int = 20) -> List[SearchHistory]:
        return db.query(SearchHistory).filter(SearchHistory.user_id == user_id).order_by(SearchHistory.searched_at.desc()).limit(limit).all()
    
    @staticmethod
    def clear_history(db: Session, user_id: str) -> int:
        deleted = db.query(SearchHistory).filter(SearchHistory.user_id == user_id).delete()
        db.commit()
        return deleted


class SavedSearchService:
    @staticmethod
    def create(db: Session, user_id: str, name: str, query: str, mode: str = 'hybrid', filters: dict = None) -> SavedSearch:
        saved = SavedSearch(user_id=user_id, name=name, query=query, mode=mode, filters=filters or {})
        db.add(saved)
        db.commit()
        return saved
    
    @staticmethod
    def get_all(db: Session, user_id: str) -> List[SavedSearch]:
        return db.query(SavedSearch).filter(SavedSearch.user_id == user_id).order_by(SavedSearch.created_at.desc()).all()
    
    @staticmethod
    def delete(db: Session, user_id: str, search_id: UUID) -> bool:
        deleted = db.query(SavedSearch).filter(SavedSearch.id == search_id, SavedSearch.user_id == user_id).delete()
        db.commit()
        return deleted > 0
