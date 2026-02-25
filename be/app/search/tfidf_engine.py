from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from app.search.tokenizer import tokenize


class TfidfEngine:
    def __init__(self):
        self.documents = []
        self.vectorizer = None
        self.tfidf_matrix = None

    def build_index(self, documents):
        """Build TF-IDF index from documents."""
        self.documents = documents
        # Get content from documents
        corpus = [doc.content for doc in documents]
        
        # Use the tokenizer for consistent preprocessing
        self.vectorizer = TfidfVectorizer(
            tokenizer=lambda x: tokenize(x),
            lowercase=True
        )
        
        self.tfidf_matrix = self.vectorizer.fit_transform(corpus)

    def search(self, query, top_k=5):
        """Search documents using TF-IDF and cosine similarity."""
        if not self.vectorizer or self.tfidf_matrix.shape[0] == 0:
            return []

        # Transform query to TF-IDF vector
        query_vector = self.vectorizer.transform([query])
        
        # Compute cosine similarity
        similarities = cosine_similarity(query_vector, self.tfidf_matrix).flatten()
        
        # Rank documents by similarity score
        ranked = sorted(
            zip(self.documents, similarities),
            key=lambda x: x[1],
            reverse=True
        )
        
        return ranked[:top_k]
