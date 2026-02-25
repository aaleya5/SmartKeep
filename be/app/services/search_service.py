import time
from app.db.session import get_db
from app.models.document import Document
from app.search.bm25_engine import BM25Engine
from app.search.tfidf_engine import TfidfEngine


class SearchIndexCache:
    """Singleton cache for search indexes to avoid rebuilding on every request."""
    
    _instance = None
    _bm25_engine = None
    _tfidf_engine = None
    _documents = None
    _last_build_time = 0
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def get_or_build(self, db, model="bm25", force_rebuild=False):
        """Get or build the search index for the specified model."""
        current_time = time.time()
        
        # Check if we need to rebuild (no cache or force rebuild)
        should_rebuild = (
            force_rebuild or 
            self._documents is None or 
            (current_time - self._last_build_time) > 300  # Rebuild every 5 minutes
        )
        
        if should_rebuild:
            documents = db.query(Document).all()
            self._documents = documents
            self._last_build_time = current_time
            
            # Build both indexes
            self._bm25_engine = BM25Engine()
            self._bm25_engine.build_index(documents)
            
            self._tfidf_engine = TfidfEngine()
            self._tfidf_engine.build_index(documents)
        
        if model == "bm25":
            return self._bm25_engine, self._documents
        elif model == "tfidf":
            return self._tfidf_engine, self._documents
        else:
            return None, []
    
    def clear_cache(self):
        """Clear the cached indexes."""
        self._bm25_engine = None
        self._tfidf_engine = None
        self._documents = None
        self._last_build_time = 0


# Global cache instance
_index_cache = SearchIndexCache()


class SearchService:
    def __init__(self, db, model="bm25"):
        self.db = db
        self.model = model
        self.engine = None
        self.documents = []
        self._load_index()

    def _load_index(self):
        """Load the search index from cache or build if not available."""
        self.engine, self.documents = _index_cache.get_or_build(self.db, self.model)

    def search(self, query, top_k=5):
        """Search documents using the specified model with timing."""
        if not self.engine:
            return {
                "results": [],
                "latency_ms": 0,
                "model": self.model
            }
        
        start_time = time.time()
        results = self.engine.search(query, top_k)
        elapsed_time = time.time() - start_time
        
        return {
            "results": results,
            "latency_ms": elapsed_time * 1000,
            "model": self.model
        }
    
    def rebuild_index(self, force=False):
        """Force rebuild the search index."""
        _index_cache.clear_cache()
        self._load_index()


class SearchBenchmark:
    """Benchmark utility for comparing search models."""
    
    def __init__(self, db):
        self.db = db
        self._ensure_indexes()

    def _ensure_indexes(self):
        """Ensure both indexes are built."""
        _index_cache.get_or_build(self.db, "bm25")
        _index_cache.get_or_build(self.db, "tfidf")

    def benchmark(self, query, top_k=5):
        """Run benchmark for both models and return comparison."""
        # Get cached engines
        bm25_engine, _ = _index_cache.get_or_build(self.db, "bm25")
        tfidf_engine, _ = _index_cache.get_or_build(self.db, "tfidf")
        
        # Benchmark BM25
        start_time = time.time()
        bm25_results = bm25_engine.search(query, top_k) if bm25_engine else []
        bm25_latency = (time.time() - start_time) * 1000
        
        # Benchmark TF-IDF
        start_time = time.time()
        tfidf_results = tfidf_engine.search(query, top_k) if tfidf_engine else []
        tfidf_latency = (time.time() - start_time) * 1000
        
        # Calculate speedup ratio safely
        if tfidf_latency > 0:
            speedup_ratio = bm25_latency / tfidf_latency
        elif bm25_latency > 0:
            speedup_ratio = float('inf')
        else:
            speedup_ratio = 1.0
        
        return {
            "query": query,
            "bm25": {
                "latency_ms": bm25_latency,
                "top_results": [
                    {"title": doc.title, "score": score}
                    for doc, score in bm25_results
                ]
            },
            "tfidf": {
                "latency_ms": tfidf_latency,
                "top_results": [
                    {"title": doc.title, "score": score}
                    for doc, score in tfidf_results
                ]
            },
            "comparison": {
                "faster_model": "bm25" if bm25_latency < tfidf_latency else "tfidf",
                "speedup_ratio": speedup_ratio
            }
        }
