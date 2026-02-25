"""
Evaluation module for search results.

Provides metrics for measuring search quality including Precision@K.
"""

from typing import List, Set, Any


def precision_at_k(retrieved: List[Any], relevant: Set[Any], k: int) -> float:
    """
    Calculate Precision@K.
    
    Precision@K = (Number of relevant documents in top K) / K
    
    Args:
        retrieved: List of retrieved document IDs in order of ranking
        relevant: Set of relevant document IDs
        k: Number of top results to consider
        
    Returns:
        Precision@K score (0.0 to 1.0)
    """
    if k <= 0:
        return 0.0
    
    # Get top K retrieved documents
    top_k = retrieved[:k]
    
    if not top_k:
        return 0.0
    
    # Count relevant documents in top K
    relevant_retrieved = sum(1 for doc_id in top_k if doc_id in relevant)
    
    # Calculate precision
    precision = relevant_retrieved / k
    
    return precision


def recall_at_k(retrieved: List[Any], relevant: Set[Any], k: int) -> float:
    """
    Calculate Recall@K.
    
    Recall@K = (Number of relevant documents in top K) / (Total relevant documents)
    
    Args:
        retrieved: List of retrieved document IDs in order of ranking
        relevant: Set of relevant document IDs
        k: Number of top results to consider
        
    Returns:
        Recall@K score (0.0 to 1.0)
    """
    if not relevant:
        return 0.0
    
    # Get top K retrieved documents
    top_k = retrieved[:k]
    
    if not top_k:
        return 0.0
    
    # Count relevant documents in top K
    relevant_retrieved = sum(1 for doc_id in top_k if doc_id in relevant)
    
    # Calculate recall
    recall = relevant_retrieved / len(relevant)
    
    return recall


def average_precision(retrieved: List[Any], relevant: Set[Any]) -> float:
    """
    Calculate Average Precision.
    
    AP = Sum(Precision@i * rel(i)) / |relevant|
    where rel(i) is 1 if the i-th retrieved document is relevant, 0 otherwise
    
    Args:
        retrieved: List of retrieved document IDs in order of ranking
        relevant: Set of relevant document IDs
        
    Returns:
        Average Precision score (0.0 to 1.0)
    """
    if not relevant:
        return 0.0
    
    num_relevant = 0
    sum_precision = 0.0
    
    for i, doc_id in enumerate(retrieved):
        if doc_id in relevant:
            num_relevant += 1
            precision_at_i = num_relevant / (i + 1)
            sum_precision += precision_at_i
    
    if num_relevant == 0:
        return 0.0
    
    return sum_precision / len(relevant)


def mean_average_precision(queries_results: List[tuple]) -> float:
    """
    Calculate Mean Average Precision (MAP) across multiple queries.
    
    MAP = Sum(AP for each query) / Number of queries
    
    Args:
        queries_results: List of tuples (retrieved, relevant) for each query
                        retrieved: List of retrieved document IDs
                        relevant: Set of relevant document IDs
        
    Returns:
        Mean Average Precision score (0.0 to 1.0)
    """
    if not queries_results:
        return 0.0
    
    ap_sum = 0.0
    for retrieved, relevant in queries_results:
        ap_sum += average_precision(retrieved, relevant)
    
    return ap_sum / len(queries_results)


class SearchEvaluator:
    """Evaluator class for testing search results."""
    
    def __init__(self):
        self.results = []
    
    def add_result(self, query: str, retrieved: List[Any], relevant: Set[Any]):
        """Add a query result for evaluation."""
        self.results.append({
            "query": query,
            "retrieved": retrieved,
            "relevant": relevant
        })
    
    def evaluate(self, k: int = 5) -> dict:
        """
        Evaluate all stored results.
        
        Args:
            k: Value of K for Precision@K and Recall@K
            
        Returns:
            Dictionary containing evaluation metrics
        """
        if not self.results:
            return {
                "precision_at_k": 0.0,
                "recall_at_k": 0.0,
                "mean_average_precision": 0.0,
                "num_queries": 0
            }
        
        # Calculate Precision@K for each query
        precisions = []
        recalls = []
        aps = []
        
        for result in self.results:
            retrieved = result["retrieved"]
            relevant = result["relevant"]
            
            precisions.append(precision_at_k(retrieved, relevant, k))
            recalls.append(recall_at_k(retrieved, relevant, k))
            aps.append(average_precision(retrieved, relevant))
        
        return {
            "precision_at_k": sum(precisions) / len(precisions) if precisions else 0.0,
            "recall_at_k": sum(recalls) / len(recalls) if recalls else 0.0,
            "mean_average_precision": sum(aps) / len(aps) if aps else 0.0,
            "num_queries": len(self.results),
            "individual_results": [
                {
                    "query": r["query"],
                    "precision_at_k": p,
                    "recall_at_k": rec,
                    "average_precision": ap
                }
                for r, p, rec, ap in zip(self.results, precisions, recalls, aps)
            ]
        }
    
    def clear(self):
        """Clear all stored results."""
        self.results = []
