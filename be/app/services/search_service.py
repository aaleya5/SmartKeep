from app.db.session import get_db
from app.models.document import Document
from app.search.bm25_engine import BM25Engine

class SearchService:
    def __init__(self, db):
        self.db = db
        self.engine = BM25Engine()

    def build(self):
        documents = self.db.query(Document).all()
        self.engine.build_index(documents)

    def search(self, query):
        return self.engine.search(query)