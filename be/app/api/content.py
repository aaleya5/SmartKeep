from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.content import URLRequest, ManualContentRequest
from app.schemas.document import DocumentResponse
from app.services.content_service import ContentService

router = APIRouter(prefix="/content", tags=["Content"])

@router.post("/url", response_model=DocumentResponse)
def create_from_url(request: URLRequest, db: Session = Depends(get_db)):
    return ContentService.create_from_url(db, request.url)

@router.post("/manual", response_model=DocumentResponse)
def create_manual(request: ManualContentRequest, db: Session = Depends(get_db)):
    return ContentService.create_manual(db, request.title, request.content)
