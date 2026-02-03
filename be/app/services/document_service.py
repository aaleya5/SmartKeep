from app.models.document import Document
from app.db.session import SessionLocal

def save_document(title, raw_text):
    db = SessionLocal()
    doc = Document(title=title, raw_text=raw_text)
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc

def get_document(doc_id):
    db = SessionLocal()
    return db.query(Document).filter(Document.id == doc_id).first()