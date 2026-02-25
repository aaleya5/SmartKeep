from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.search_service import SearchService, SearchBenchmark

router = APIRouter()


@router.get("/search")
def search(
    query: str,
    model: str = Query("bm25", enum=["bm25", "tfidf"], description="Search model: bm25 or tfidf"),
    top_k: int = Query(5, ge=1, le=20, description="Number of results to return"),
    db: Session = Depends(get_db)
):
    """
    Unified search endpoint supporting both BM25 and TF-IDF models.
    
    - **query**: Search query string
    - **model**: Search model - "bm25" or "tfidf"
    - **top_k**: Number of results to return (default: 5)
    """
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
    Benchmark endpoint comparing BM25 and TF-IDF performance.
    
    Returns latency and results for both models for comparison.
    """
    benchmark = SearchBenchmark(db)
    result = benchmark.benchmark(query, top_k)
    
    return result
