from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.content import URLRequest, ManualContentRequest
from app.schemas.document import DocumentResponse
from app.services.content_service import ContentService, DuplicateURLError, ContentTooLongError
from app.services.enrichment_service import enrichment_service
from app.models.document import Document

router = APIRouter(prefix="/content", tags=["Content"])


@router.post("/url", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def create_from_url(request: URLRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    try:
        return ContentService.create_from_url(db, str(request.url), background_tasks)
    except DuplicateURLError as e:
        raise HTTPException(
            status_code=409, 
            detail={
                "message": str(e),
                "document_id": e.document_id,
                "saved_date": e.saved_date,
                "title": e.title
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/manual", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def create_manual(request: ManualContentRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    try:
        return ContentService.create_manual(db, request.title, request.content, background_tasks)
    except ContentTooLongError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{document_id}/enrich", response_model=DocumentResponse)
def enrich_document(document_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Manually trigger enrichment for a document.
    
    This is useful when:
    - Enrichment previously failed
    - The user wants a fresh summary
    - New content was added
    """
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=404,
            detail=f"Document {document_id} not found"
        )
    
    # Reset enrichment status and trigger background task
    document.enrichment_status = "pending"
    db.commit()
    
    # Trigger background enrichment with error handling
    try:
        background_tasks.add_task(enrichment_service.enrich_document, document_id)
    except Exception as e:
        # Log the error but don't fail the request - enrichment can be retried
        document.enrichment_status = "failed"
        db.commit()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start enrichment: {str(e)}"
        )
    
    # Return the document (enrichment will happen in background)
    return document
