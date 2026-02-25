from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.db.session import get_db
from app.services.search_service import SearchService
from app.evaluation.metrics import SearchEvaluator, precision_at_k, recall_at_k

router = APIRouter()


class EvaluationQuery(BaseModel):
    """Pydantic model for evaluation query."""
    query: str
    relevant_ids: List[int]


class EvaluationRequest(BaseModel):
    """Pydantic model for batch evaluation request."""
    queries: List[EvaluationQuery]


@router.post("/evaluate")
def evaluate_search(
    request: EvaluationRequest,
    model: str = Query("bm25", enum=["bm25", "tfidf"]),
    k: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db)
):
    """
    Evaluate search results for a list of queries.
    
    Request body format:
    {
        "queries": [
            {
                "query": "search term",
                "relevant_ids": [1, 2, 3]
            }
        ]
    }
    
    Returns precision@K, recall@K, and mean average precision.
    """
    try:
        evaluator = SearchEvaluator()
        
        # Get search service
        service = SearchService(db, model=model)
        
        for item in request.queries:
            query = item.query
            relevant_ids = set(item.relevant_ids)
            
            # Get search results
            result = service.search(query, top_k=k)
            
            # Extract retrieved document IDs
            retrieved_ids = [doc.id for doc, score in result["results"]]
            
            # Add to evaluator
            evaluator.add_result(query, retrieved_ids, relevant_ids)
        
        # Get evaluation metrics
        evaluation = evaluator.evaluate(k=k)
        
        return {
            "model": model,
            "k": k,
            "metrics": evaluation
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")


@router.get("/evaluate/precision")
def evaluate_precision(
    query: str,
    relevant_ids: str = Query(..., description="Comma-separated relevant document IDs"),
    model: str = Query("bm25", enum=["bm25", "tfidf"]),
    k: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db)
):
    """
    Evaluate Precision@K for a single query.
    
    - **query**: Search query string
    - **relevant_ids**: Comma-separated list of relevant document IDs
    - **model**: Search model (bm25 or tfidf)
    - **k**: Number of top results to consider
    """
    try:
        # Parse relevant IDs
        try:
            relevant = set(int(id.strip()) for id in relevant_ids.split(",") if id.strip())
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid relevant_ids format. Must be comma-separated integers.")
        
        if not relevant:
            raise HTTPException(status_code=400, detail="At least one relevant_id is required.")
        
        # Get search results
        service = SearchService(db, model=model)
        result = service.search(query, top_k=k)
        
        # Extract retrieved document IDs
        retrieved_ids = [doc.id for doc, score in result["results"]]
        
        # Calculate metrics
        precision = precision_at_k(retrieved_ids, relevant, k)
        recall = recall_at_k(retrieved_ids, relevant, k)
        
        return {
            "query": query,
            "model": model,
            "k": k,
            "retrieved_ids": retrieved_ids,
            "relevant_ids": list(relevant),
            "precision_at_k": precision,
            "recall_at_k": recall
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")
