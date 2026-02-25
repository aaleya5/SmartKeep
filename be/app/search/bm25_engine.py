from rank_bm25 import BM25Okapi
from app.search.tokenizer import tokenize

class BM25Engine:
    def __init__(self):
        self.documents = []
        self.bm25 = None

    def build_index(self, documents):
        self.documents = documents
        tokenized_corpus = [tokenize(doc.content) for doc in documents]
        self.bm25 = BM25Okapi(tokenized_corpus)

    def search(self, query, top_k=5):
        if not self.bm25:
            return []

        tokenized_query = tokenize(query)
        scores = self.bm25.get_scores(tokenized_query)

        ranked = sorted(
            zip(self.documents, scores),
            key=lambda x: x[1],
            reverse=True
        )

        return ranked[:top_k]