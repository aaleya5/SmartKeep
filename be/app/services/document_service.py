from app.models.document import Document
from app.db.session import SessionLocal

def save_document(title, content):
    """Save a document with title and content."""
    db = SessionLocal()
    doc = Document(title=title, content=content)
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc

def get_document(doc_id):
    """Get a document by ID."""
    db = SessionLocal()
    return db.query(Document).filter(Document.id == doc_id).first()