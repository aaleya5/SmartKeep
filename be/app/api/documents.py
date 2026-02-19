from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.document import Document

router = APIRouter(prefix="/documents", tags=["Documents"])

@router.get("/")
def get_all_documents(db: Session = Depends(get_db)):
    return db.query(Document).all()
