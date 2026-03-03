"""
Semantic Search Service using pgvector.

This service provides semantic search capabilities using:
1. Sentence-transformers for query embedding
2. pgvector for cosine similarity search (<=> operator)
"""

import time
import logging
from typing import List, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models.document import Document
from app.services.embedding_service import embedding_service
from app.core.config import settings


logger = logging.getLogger(__name__)


class SemanticSearchService:
    """
    Service for semantic search using pgvector.
    
    Uses cosine similarity (<=>) operator for finding similar documents.
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def semantic_search(self, query: str, top_k: int = 10) -> Dict[str, Any]:
        """
        Perform semantic search using vector similarity.
        
        Args:
            query: The search query
            top_k: Number of results to return
            
        Returns:
            Dictionary with results and latency
        """
        start_time = time.time()
        
        # Check if embedding column exists
        try:
            check_sql = text("SELECT embedding FROM documents LIMIT 1")
            self.db.execute(check_sql)
        except Exception as e:
            logger.warning(f"Embedding column not available: {e}")
            return {
                "results": [],
                "latency_ms": 0,
                "model": "semantic",
                "error": "Semantic search not available. Please run the pgvector migration."
            }
        
        # Generate embedding for the query
        query_embedding = embedding_service.embed(query)
        embedding_string = embedding_service.embedding_to_vector_string(query_embedding)
        
        # Perform cosine similarity search using pgvector
        # The <=> operator computes cosine distance, so we order by distance ascending
        # and convert to similarity (1 - distance)
        sql = text("""
            SELECT 
                id, title, content, source_url, domain, tags, 
                is_truncated, created_at, enrichment_status, summary, 
                suggested_tags, reading_time, difficulty_score,
                1 - (embedding <=> :embedding::vector) as similarity
            FROM documents
            WHERE embedding IS NOT NULL
            ORDER BY embedding <=> :embedding2::vector
            LIMIT :top_k
        """)
        
        result = self.db.execute(
            sql, 
            {"embedding": embedding_string, "embedding2": embedding_string, "top_k": top_k}
        )
        
        rows = result.fetchall()
        
        # Convert to document-like objects
        documents = []
        for row in rows:
            doc = {
                "id": row.id,
                "title": row.title,
                "content": row.content,
                "source_url": row.source_url,
                "domain": row.domain,
                "tags": row.tags,
                "is_truncated": row.is_truncated,
                "created_at": row.created_at,
                "enrichment_status": row.enrichment_status,
                "summary": row.summary,
                "suggested_tags": row.suggested_tags,
                "reading_time": row.reading_time,
                "difficulty_score": row.difficulty_score,
                "similarity_score": float(row.similarity) if row.similarity else 0.0
            }
            documents.append(doc)
        
        elapsed_time = time.time() - start_time
        
        return {
            "results": documents,
            "latency_ms": elapsed_time * 1000,
            "model": "semantic"
        }
    
    def hybrid_search(
        self, 
        query: str, 
        top_k: int = 10,
        bm25_weight: float = None,
        semantic_weight: float = None
    ) -> Dict[str, Any]:
        """
        Perform hybrid search combining BM25 and semantic search.
        
        Args:
            query: The search query
            top_k: Number of results to return
            bm25_weight: Weight for BM25 scores (default from config)
            semantic_weight: Weight for semantic scores (default from config)
            
        Returns:
            Dictionary with merged and re-ranked results
        """
        # Use config defaults if not specified
        if bm25_weight is None:
            bm25_weight = settings.HYBRID_SEARCH_BM25_WEIGHT
        if semantic_weight is None:
            semantic_weight = settings.HYBRID_SEARCH_SEMANTIC_WEIGHT
        
        # Validate weights - handle edge cases
        if bm25_weight <= 0 and semantic_weight <= 0:
            # Default to equal weights if both are zero or negative
            bm25_weight = 0.5
            semantic_weight = 0.5
        else:
            bm25_weight = max(0, bm25_weight)
            semantic_weight = max(0, semantic_weight)
            total_weight = bm25_weight + semantic_weight
            if total_weight > 0:
                bm25_weight = bm25_weight / total_weight
                semantic_weight = semantic_weight / total_weight
        
        start_time = time.time()
        
        # Get BM25 results (using existing search service)
        from app.services.search_service import SearchService
        bm25_service = SearchService(self.db, model="bm25")
        bm25_results = bm25_service.search(query, top_k * 2)  # Get more for merging
        
        # Get semantic results
        semantic_results = self.semantic_search(query, top_k * 2)
        
        # Normalize and merge scores
        bm25_dict = {}
        if bm25_results["results"]:
            max_bm25_score = max(score for _, score in bm25_results["results"]) if bm25_results["results"] else 1
            for doc, score in bm25_results["results"]:
                bm25_dict[doc.id] = {
                    "document": doc,
                    "bm25_score": score / max_bm25_score if max_bm25_score > 0 else 0,
                    "semantic_score": 0
                }
        
        # Merge semantic results
        for doc in semantic_results["results"]:
            doc_id = doc["id"]
            if doc_id in bm25_dict:
                bm25_dict[doc_id]["semantic_score"] = doc["similarity_score"]
            else:
                bm25_dict[doc_id] = {
                    "document": doc,
                    "bm25_score": 0,
                    "semantic_score": doc["similarity_score"]
                }
        
        # Calculate combined scores and sort
        combined_results = []
        for doc_id, scores in bm25_dict.items():
            combined_score = (
                bm25_weight * scores["bm25_score"] + 
                semantic_weight * scores["semantic_score"]
            )
            doc = scores["document"]
            combined_results.append({
                "id": doc_id,
                "title": doc.title,
                "content": doc.content if hasattr(doc, 'content') else doc.get('content', ''),
                "source_url": doc.source_url if hasattr(doc, 'source_url') else doc.get('source_url'),
                "domain": doc.domain if hasattr(doc, 'domain') else doc.get('domain'),
                "tags": doc.tags if hasattr(doc, 'tags') else doc.get('tags'),
                "is_truncated": doc.is_truncated if hasattr(doc, 'is_truncated') else doc.get('is_truncated', False),
                "bm25_score": scores["bm25_score"],
                "semantic_score": scores["semantic_score"],
                "combined_score": combined_score
            })
        
        # Sort by combined score
        combined_results.sort(key=lambda x: x["combined_score"], reverse=True)
        
        # Limit to top_k
        combined_results = combined_results[:top_k]
        
        elapsed_time = time.time() - start_time
        
        return {
            "results": combined_results,
            "latency_ms": elapsed_time * 1000,
            "model": "hybrid",
            "weights": {
                "bm25": bm25_weight,
                "semantic": semantic_weight
            }
        }
