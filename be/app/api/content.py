from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.content import URLRequest, ManualContentRequest
from app.schemas.document import DocumentResponse
from app.services.content_service import ContentService, DuplicateURLError, ContentTooLongError

router = APIRouter(prefix="/content", tags=["Content"])


@router.post("/url", response_model=DocumentResponse)
def create_from_url(request: URLRequest, db: Session = Depends(get_db)):
    try:
        return ContentService.create_from_url(db, str(request.url))
    except DuplicateURLError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/manual", response_model=DocumentResponse)
def create_manual(request: ManualContentRequest, db: Session = Depends(get_db)):
    try:
        return ContentService.create_manual(db, request.title, request.content)
    except ContentTooLongError as e:
        raise HTTPException(status_code=400, detail=str(e))
