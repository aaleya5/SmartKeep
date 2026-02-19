from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.search_service import SearchService

router = APIRouter()

@router.get("/search")
def search(query: str, db: Session = Depends(get_db)):
    service = SearchService(db)
    service.build()
    results = service.search(query)

    return [
        {
            "title": doc.title,
            "score": score
        }
        for doc, score in results
    ]