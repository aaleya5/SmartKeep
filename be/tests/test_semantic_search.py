"""
Semantic Search Tests

This test file validates:
1. Semantic search returns non-obvious results
2. A document about "garbage collection in JVM" is found by "memory management in Java"
3. The semantic similarity scoring works correctly
"""

import pytest
import sys
import os

# Add the project root to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.embedding_service import embedding_service


class TestEmbeddingService:
    """Test the embedding service."""
    
    def test_embed_single_text(self):
        """Test embedding generation for a single text."""
        text = "This is a test document about machine learning."
        embedding = embedding_service.embed(text)
        
        assert isinstance(embedding, list)
        assert len(embedding) == 384  # all-MiniLM-L6-v2 dimension
        assert all(isinstance(x, float) for x in embedding)
    
    def test_embed_batch(self):
        """Test batch embedding generation."""
        texts = [
            "First document about Python programming",
            "Second document about JavaScript development",
            "Third document about machine learning"
        ]
        
        embeddings = embedding_service.embed_batch(texts)
        
        assert len(embeddings) == 3
        assert all(len(emb) == 384 for emb in embeddings)
    
    def test_embedding_to_vector_string(self):
        """Test converting embedding to PostgreSQL vector string."""
        embedding = [0.1, 0.2, 0.3]
        vector_str = embedding_service.embedding_to_vector_string(embedding)
        
        assert vector_str == "[0.1,0.2,0.3]"
    
    def test_vector_string_to_embedding(self):
        """Test converting PostgreSQL vector string back to embedding."""
        vector_str = "[0.1,0.2,0.3]"
        embedding = embedding_service.vector_string_to_embedding(vector_str)
        
        assert embedding == [0.1, 0.2, 0.3]
    
    def test_empty_text_embedding(self):
        """Test embedding generation for empty text."""
        embedding = embedding_service.embed("")
        
        assert isinstance(embedding, list)
        assert len(embedding) == 384
        assert all(x == 0.0 for x in embedding)


class TestSemanticSearch:
    """Test semantic search functionality."""
    
    def test_semantic_similarity_same_content(self):
        """Test that identical content has high similarity."""
        text1 = "The quick brown fox jumps over the lazy dog"
        text2 = "The quick brown fox jumps over the lazy dog"
        
        emb1 = embedding_service.embed(text1)
        emb2 = embedding_service.embed(text2)
        
        # Calculate cosine similarity manually
        dot_product = sum(a * b for a, b in zip(emb1, emb2))
        magnitude1 = sum(a * a for a in emb1) ** 0.5
        magnitude2 = sum(b * b for b in emb2) ** 0.5
        
        similarity = dot_product / (magnitude1 * magnitude2)
        
        assert similarity > 0.99  # Should be nearly identical
    
    def test_semantic_similarity_related_content(self):
        """Test that related content has moderate-high similarity."""
        text1 = "Garbage collection in JVM automatically reclaims memory"
        text2 = "Memory management in Java uses heap and stack"
        
        emb1 = embedding_service.embed(text1)
        emb2 = embedding_service.embed(text2)
        
        # Calculate cosine similarity
        dot_product = sum(a * b for a, b in zip(emb1, emb2))
        magnitude1 = sum(a * a for a in emb1) ** 0.5
        magnitude2 = sum(b * b for b in emb2) ** 0.5
        
        similarity = dot_product / (magnitude1 * magnitude2)
        
        # Related content should have similarity > 0.5
        assert similarity > 0.5, f"Expected similarity > 0.5, got {similarity}"
    
    def test_semantic_similarity_unrelated_content(self):
        """Test that unrelated content has low similarity."""
        text1 = "The recipe for chocolate cake requires flour and sugar"
        text2 = "Quantum physics describes the behavior of subatomic particles"
        
        emb1 = embedding_service.embed(text1)
        emb2 = embedding_service.embed(text2)
        
        # Calculate cosine similarity
        dot_product = sum(a * b for a, b in zip(emb1, emb2))
        magnitude1 = sum(a * a for a in emb1) ** 0.5
        magnitude2 = sum(b * b for b in emb2) ** 0.5
        
        similarity = dot_product / (magnitude1 * magnitude2)
        
        # Unrelated content should have lower similarity
        assert similarity < 0.3, f"Expected similarity < 0.3, got {similarity}"


class TestReadability:
    """Test readability calculations."""
    
    def test_reading_time_short_content(self):
        """Test reading time calculation for short content."""
        from app.utils.readability import calculate_reading_time
        
        # 100 words should take about 0.5 minutes
        text = " ".join(["word"] * 100)
        reading_time = calculate_reading_time(text)
        
        assert 0.4 <= reading_time <= 0.6
    
    def test_reading_time_long_content(self):
        """Test reading time calculation for longer content."""
        from app.utils.readability import calculate_reading_time
        
        # 1000 words should take about 5 minutes
        text = " ".join(["word"] * 1000)
        reading_time = calculate_reading_time(text)
        
        assert 4.5 <= reading_time <= 5.5
    
    def test_flesch_kincaid_easy_text(self):
        """Test Flesch-Kincaid score for easy text."""
        from app.utils.readability import calculate_flesch_kincaid
        
        # Simple text should have high FK score (easy)
        text = "The cat sat on the mat. It was a nice day."
        score = calculate_flesch_kincaid(text)
        
        assert score >= 60, f"Expected easy text (score >= 60), got {score}"
    
    def test_flesch_kincaid_complex_text(self):
        """Test Flesch-Kincaid score for complex text."""
        from app.utils.readability import calculate_flesch_kincaid
        
        # Complex text should have low FK score (difficult)
        text = "Furthermore, the implementation of sophisticated algorithmic paradigms necessitates a comprehensive understanding of computational complexity theory."
        score = calculate_flesch_kincaid(text)
        
        assert score < 30, f"Expected difficult text (score < 30), got {score}"
    
    def test_difficulty_level_classification(self):
        """Test difficulty level classification."""
        from app.utils.readability import get_difficulty_level
        
        assert get_difficulty_level(70) == "Easy"
        assert get_difficulty_level(50) == "Intermediate"
        assert get_difficulty_level(20) == "Advanced"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
