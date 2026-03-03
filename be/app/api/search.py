from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.search_service import SearchService, SearchBenchmark
from app.services.search_fts_service import SearchFTSService

router = APIRouter()


@router.get("/search")
def search(
    query: str,
    model: str = Query("bm25", enum=["bm25", "tfidf", "fts"], description="Search model: bm25, tfidf, or fts (PostgreSQL)"),
    top_k: int = Query(5, ge=1, le=20, description="Number of results to return"),
    tags: str = Query(None, description="Filter by tags (comma-separated)"),
    date_from: str = Query(None, description="Filter by date from (ISO format)"),
    date_to: str = Query(None, description="Filter by date to (ISO format)"),
    domain: str = Query(None, description="Filter by domain"),
    db: Session = Depends(get_db)
):
    """
    Unified search endpoint supporting BM25, TF-IDF, and PostgreSQL FTS.
    
    - **query**: Search query string
    - **model**: Search model - "bm25", "tfidf", or "fts" (PostgreSQL Full-Text Search)
    - **top_k**: Number of results to return (default: 5)
    - **tags**: Filter by tags (comma-separated) - only for fts model
    - **date_from**: Filter documents created after this date (ISO format) - only for fts model
    - **date_to**: Filter documents created before this date (ISO format) - only for fts model
    - **domain**: Filter by domain - only for fts model
    """
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
                "title": doc.title,
                "content": doc.content[:200] + "..." if len(doc.content) > 200 else doc.content,
                "score": float(score)
            }
            for doc, score in result["results"]
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
    Benchmark endpoint comparing BM25, TF-IDF, and PostgreSQL FTS performance.
    
    Returns latency and results for all three models for comparison.
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
    
    # Update comparison
    all_latencies = {
        "bm25": benchmark_result["bm25"]["latency_ms"],
        "tfidf": benchmark_result["tfidf"]["latency_ms"],
        "fts": fts_latency
    }
    fastest = min(all_latencies, key=all_latencies.get)
    benchmark_result["comparison"]["faster_model"] = fastest
    
    return benchmark_result
