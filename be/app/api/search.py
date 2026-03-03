from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.search_service import SearchService, SearchBenchmark
from app.services.search_fts_service import SearchFTSService
from app.services.semantic_search_service import SemanticSearchService

router = APIRouter()


@router.get("/search")
def search(
    query: str,
    model: str = Query("bm25", enum=["bm25", "tfidf", "fts", "semantic", "hybrid"], description="Search model: bm25, tfidf, fts (PostgreSQL), semantic (vector), or hybrid (bm25 + semantic)"),
    top_k: int = Query(5, ge=1, le=20, description="Number of results to return"),
    tags: str = Query(None, description="Filter by tags (comma-separated)"),
    date_from: str = Query(None, description="Filter by date from (ISO format)"),
    date_to: str = Query(None, description="Filter by date to (ISO format)"),
    domain: str = Query(None, description="Filter by domain"),
    db: Session = Depends(get_db)
):
    """
    Unified search endpoint supporting multiple search models.
    
    - **query**: Search query string
    - **model**: Search model - "bm25", "tfidf", "fts" (PostgreSQL FTS), "semantic" (vector), or "hybrid"
    - **top_k**: Number of results to return (default: 5)
    - **tags**: Filter by tags (comma-separated) - only for fts model
    - **date_from**: Filter documents created after this date (ISO format) - only for fts model
    - **date_to**: Filter documents created before this date (ISO format) - only for fts model
    - **domain**: Filter by domain - only for fts model
    """
    # Use semantic search
    if model == "semantic":
        semantic_service = SemanticSearchService(db)
        result = semantic_service.semantic_search(query, top_k)
        
        return {
            "query": query,
            "model": "semantic",
            "latency_ms": result["latency_ms"],
            "results": [
                {
                    "id": doc["id"],
                    "title": doc["title"],
                    "content": doc["content"][:200] + "..." if len(doc["content"]) > 200 else doc["content"],
                    "source_url": doc["source_url"],
                    "domain": doc["domain"],
                    "score": doc["similarity_score"]
                }
                for doc in result["results"]
            ]
        }
    
    # Use hybrid search
    if model == "hybrid":
        semantic_service = SemanticSearchService(db)
        result = semantic_service.hybrid_search(query, top_k)
        
        return {
            "query": query,
            "model": "hybrid",
            "latency_ms": result["latency_ms"],
            "weights": result["weights"],
            "results": [
                {
                    "id": doc["id"],
                    "title": doc["title"],
                    "content": doc["content"][:200] + "..." if len(doc["content"]) > 200 else doc["content"],
                    "source_url": doc["source_url"],
                    "domain": doc["domain"],
                    "bm25_score": doc["bm25_score"],
                    "semantic_score": doc["semantic_score"],
                    "score": doc["combined_score"]
                }
                for doc in result["results"]
            ]
        }
    
    # Use PostgreSQL FTS for 'fts' model
    if model == "fts":
        fts_service = SearchFTSService(db)
        
        # Check if filters are provided
        if any([tags, date_from, date_to, domain]):
            result = fts_service.search_with_filters(
                query, top_k, tags, date_from, date_to, domain
            )
        else:
            result = fts_service.search(query, top_k, tags)
        
        return {
            "query": query,
            "model": "fts",
            "latency_ms": result["latency_ms"],
            "results": [
                {
                    "id": doc.id,
                    "title": doc.title,
                    "content": doc.content[:200] + "..." if len(doc.content) > 200 else doc.content,
                    "score": float(score)
                }
                for doc, score in result["results"]
            ]
        }
    
    # Use BM25 or TF-IDF for other models
    service = SearchService(db, model=model)
    result = service.search(query, top_k)
    
    return {
        "query": query,
        "model": model,
        "latency_ms": result["latency_ms"],
        "results": [
            {
                "id": doc.id,
                "title": doc.title,
                "content": doc.content[:200] + "..." if len(doc.content) > 200 else doc.content,
                "score": float(score)
            }
            for doc, score in result["results"]
        ]
    }


@router.get("/search/semantic")
def search_semantic(
    query: str,
    top_k: int = Query(10, ge=1, le=20, description="Number of results to return"),
    db: Session = Depends(get_db)
):
    """
    Semantic search endpoint using vector embeddings.
    
    Uses cosine similarity to find documents semantically similar to the query.
    Returns results with a similarity_score field (0.0-1.0).
    """
    semantic_service = SemanticSearchService(db)
    result = semantic_service.semantic_search(query, top_k)
    
    return {
        "query": query,
        "model": "semantic",
        "latency_ms": result["latency_ms"],
        "results": [
            {
                "id": doc["id"],
                "title": doc["title"],
                "content": doc["content"][:200] + "..." if len(doc["content"]) > 200 else doc["content"],
                "source_url": doc["source_url"],
                "domain": doc["domain"],
                "summary": doc.get("summary"),
                "reading_time": doc.get("reading_time"),
                "difficulty_score": doc.get("difficulty_score"),
                "similarity_score": round(doc["similarity_score"], 4)
            }
            for doc in result["results"]
        ]
    }


@router.get("/search/hybrid")
def search_hybrid(
    query: str,
    top_k: int = Query(10, ge=1, le=20, description="Number of results to return"),
    bm25_weight: float = Query(0.4, ge=0.0, le=1.0, description="Weight for BM25 (semantic = 1 - bm25_weight)"),
    db: Session = Depends(get_db)
):
    """
    Hybrid search endpoint combining BM25 and semantic search.
    
    Merges BM25 results and cosine similarity results, deduplicates by ID,
    and re-ranks by weighted score (default: 0.4 * bm25 + 0.6 * semantic).
    
    The weighting is configurable via the bm25_weight parameter.
    """
    semantic_service = SemanticSearchService(db)
    semantic_weight = 1.0 - bm25_weight
    result = semantic_service.hybrid_search(query, top_k, bm25_weight, semantic_weight)
    
    return {
        "query": query,
        "model": "hybrid",
        "latency_ms": result["latency_ms"],
        "weights": {
            "bm25": bm25_weight,
            "semantic": semantic_weight
        },
        "results": [
            {
                "id": doc["id"],
                "title": doc["title"],
                "content": doc["content"][:200] + "..." if len(doc["content"]) > 200 else doc["content"],
                "source_url": doc["source_url"],
                "domain": doc["domain"],
                "bm25_score": round(doc["bm25_score"], 4),
                "semantic_score": round(doc["semantic_score"], 4),
                "score": round(doc["combined_score"], 4)
            }
            for doc in result["results"]
        ]
    }


@router.get("/search/tfidf")
def search_tfidf(
    query: str,
    top_k: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db)
):
    """
    TF-IDF search endpoint (alternative endpoint).
    
    - **query**: Search query string
    - **top_k**: Number of results to return
    """
    service = SearchService(db, model="tfidf")
    result = service.search(query, top_k)
    
    return {
        "query": query,
        "model": "tfidf",
        "latency_ms": result["latency_ms"],
        "results": [
            {
                "title": doc.title,
                "content": doc.content[:200] + "..." if len(doc.content) > 200 else doc.content,
                "score": float(score)
            }
            for doc, score in result["results"]
        ]
    }


@router.get("/search/benchmark")
def search_benchmark(
    query: str,
    top_k: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db)
):
    """
    Benchmark endpoint comparing search models.
    
    Returns latency and results for all available models for comparison.
    """
    benchmark = SearchBenchmark(db)
    benchmark_result = benchmark.benchmark(query, top_k)
    
    # Add PostgreSQL FTS benchmark
    fts_service = SearchFTSService(db)
    fts_start = __import__('time').time()
    fts_results = fts_service.search(query, top_k)
    fts_latency = (__import__('time').time() - fts_start) * 1000
    
    benchmark_result["fts"] = {
        "latency_ms": fts_latency,
        "top_results": [
            {"title": doc.title, "score": score}
            for doc, score in fts_results["results"]
        ]
    }
    
    # Add semantic search benchmark
    semantic_service = SemanticSearchService(db)
    semantic_start = __import__('time').time()
    semantic_results = semantic_service.semantic_search(query, top_k)
    semantic_latency = (__import__('time').time() - semantic_start) * 1000
    
    benchmark_result["semantic"] = {
        "latency_ms": semantic_latency,
        "top_results": [
            {"title": doc["title"], "score": doc["similarity_score"]}
            for doc in semantic_results["results"]
        ]
    }
    
    # Add hybrid search benchmark
    hybrid_start = __import__('time').time()
    hybrid_results = semantic_service.hybrid_search(query, top_k)
    hybrid_latency = (__import__('time').time() - hybrid_start) * 1000
    
    benchmark_result["hybrid"] = {
        "latency_ms": hybrid_latency,
        "top_results": [
            {"title": doc["title"], "score": doc["combined_score"]}
            for doc in hybrid_results["results"]
        ]
    }
    
    # Update comparison
    all_latencies = {
        "bm25": benchmark_result["bm25"]["latency_ms"],
        "tfidf": benchmark_result["tfidf"]["latency_ms"],
        "fts": fts_latency,
        "semantic": semantic_latency,
        "hybrid": hybrid_latency
    }
    fastest = min(all_latencies, key=all_latencies.get)
    benchmark_result["comparison"]["faster_model"] = fastest
    
    return benchmark_result
