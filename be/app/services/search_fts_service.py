"""
PostgreSQL Full-Text Search Service

Provides native PostgreSQL FTS using ts_vector and ts_rank.
"""
import time
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.models.document import Document


class SearchFTSService:
    """PostgreSQL Full-Text Search service."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def search(self, query: str, top_k: int = 5, tags: str = None):
        """
        Search using PostgreSQL full-text search.
        
        Args:
            query: Search query string
            top_k: Number of results to return
            tags: Optional comma-separated tags to filter by
            
        Returns:
            List of (document, score) tuples
        """
        start_time = time.time()
        
        # Build the query with ts_rank for relevance scoring
        sql = """
            SELECT d.*, 
                   ts_rank(d.search_vector, plainto_tsquery('english', :query)) as rank
            FROM documents d
            WHERE d.search_vector IS NOT NULL
              AND d.search_vector @@ plainto_tsquery('english', :query)
        """
        
        # Add tag filter if provided
        if tags:
            tag_list = [t.strip() for t in tags.split(',')]
            placeholders = ', '.join([f":tag{i}" for i in range(len(tag_list))])
            sql += f" AND d.tags IN ({placeholders})"
        
        sql += """
            ORDER BY rank DESC
            LIMIT :top_k
        """
        
        # Build params
        params = {'query': query, 'top_k': top_k}
        if tags:
            for i, tag in enumerate(tag_list):
                params[f'tag{i}'] = tag
        
        result = self.db.execute(text(sql), params)
        rows = result.fetchall()
        
        elapsed_time = time.time() - start_time
        
        # Convert rows to Document objects with scores
        documents = []
        for row in rows:
            doc = Document(
                id=row.id,
                title=row.title,
                content=row.content,
                source_url=row.source_url,
                domain=row.domain,
                tags=row.tags,
                created_at=row.created_at
            )
            documents.append((doc, float(row.rank)))
        
        return {
            'results': documents,
            'latency_ms': elapsed_time * 1000,
            'model': 'postgresql_fts'
        }
    
    def search_with_filters(
        self, 
        query: str, 
        top_k: int = 5, 
        tags: str = None,
        date_from: str = None,
        date_to: str = None,
        domain: str = None
    ):
        """
        Advanced search with multiple filters.
        
        Args:
            query: Search query string
            top_k: Number of results
            tags: Filter by tags (comma-separated)
            date_from: Filter documents created after this date (ISO format)
            date_to: Filter documents created before this date (ISO format)
            domain: Filter by domain
        """
        start_time = time.time()
        
        # Build dynamic query
        sql_parts = [
            "SELECT d.*, ts_rank(d.search_vector, plainto_tsquery('english', :query)) as rank",
            "FROM documents d",
            "WHERE d.search_vector IS NOT NULL",
            "AND d.search_vector @@ plainto_tsquery('english', :query)"
        ]
        params = {'query': query, 'top_k': top_k}
        
        # Add filters
        if tags:
            tag_list = [t.strip() for t in tags.split(',')]
            placeholders = ', '.join([f":tag{i}" for i in range(len(tag_list))])
            sql_parts.append(f"AND d.tags IN ({placeholders})")
            for i, tag in enumerate(tag_list):
                params[f'tag{i}'] = tag
        
        if date_from:
            sql_parts.append("AND d.created_at >= :date_from")
            params['date_from'] = date_from
        
        if date_to:
            sql_parts.append("AND d.created_at <= :date_to")
            params['date_to'] = date_to
        
        if domain:
            sql_parts.append("AND d.domain = :domain")
            params['domain'] = domain
        
        sql_parts.append("ORDER BY rank DESC LIMIT :top_k")
        
        sql = ' '.join(sql_parts)
        result = self.db.execute(text(sql), params)
        rows = result.fetchall()
        
        elapsed_time = time.time() - start_time
        
        documents = []
        for row in rows:
            doc = Document(
                id=row.id,
                title=row.title,
                content=row.content,
                source_url=row.source_url,
                domain=row.domain,
                tags=row.tags,
                created_at=row.created_at
            )
            documents.append((doc, float(row.rank)))
        
        return {
            'results': documents,
            'latency_ms': elapsed_time * 1000,
            'model': 'postgresql_fts'
        }
