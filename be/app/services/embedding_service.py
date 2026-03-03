"""
Embedding Service using sentence-transformers.

This service generates 384-dimensional embeddings using the all-MiniLM-L6-v2 model,
which runs locally and requires no API key.
"""

import numpy as np
from sentence_transformers import SentenceTransformer
from typing import List


class EmbeddingService:
    """
    Service for generating document embeddings using sentence-transformers.
    
    Uses the all-MiniLM-L6-v2 model which produces 384-dimensional embeddings.
    This model runs locally and is optimized for semantic search.
    """
    
    # Singleton instance
    _instance = None
    _model = None
    
    # Embedding dimension for all-MiniLM-L6-v2
    EMBEDDING_DIMENSION = 384
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def _get_model(self):
        """Lazy-load the model on first use."""
        if self._model is None:
            # Using all-MiniLM-L6-v2 - a fast, lightweight model with 384 dimensions
            self._model = SentenceTransformer('all-MiniLM-L6-v2')
        return self._model
    
    def embed(self, text: str) -> List[float]:
        """
        Generate embedding for a single text string.
        
        Args:
            text: The text to embed (typically title + body)
            
        Returns:
            List of 384 float values representing the embedding
        """
        if not text or not text.strip():
            return [0.0] * self.EMBEDDING_DIMENSION
        
        model = self._get_model()
        # Generate embedding
        embedding = model.encode(text.strip(), convert_to_numpy=True)
        
        return embedding.tolist()
    
    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts efficiently.
        
        Args:
            texts: List of texts to embed
            
        Returns:
            List of embeddings (each a list of 384 float values)
        """
        if not texts:
            return []
        
        # Filter out empty texts
        valid_texts = [t if t and t.strip() else "" for t in texts]
        
        model = self._get_model()
        embeddings = model.encode(valid_texts, convert_to_numpy=True, batch_size=32)
        
        # Convert to list of lists
        return [emb.tolist() for emb in embeddings]
    
    def embedding_to_vector_string(self, embedding: List[float]) -> str:
        """
        Convert embedding list to PostgreSQL vector string format.
        
        Args:
            embedding: List of float values
            
        Returns:
            String in format '[val1,val2,...]'
        """
        return '[' + ','.join(str(v) for v in embedding) + ']'
    
    def vector_string_to_embedding(self, vector_string: str) -> List[float]:
        """
        Convert PostgreSQL vector string back to embedding list.
        
        Args:
            vector_string: String in format '[val1,val2,...]'
            
        Returns:
            List of float values
        """
        if not vector_string:
            return [0.0] * self.EMBEDDING_DIMENSION
        
        # Remove brackets and split by comma
        cleaned = vector_string.strip('[]')
        values = cleaned.split(',')
        
        return [float(v) for v in values]


# Singleton instance for easy import
embedding_service = EmbeddingService()
