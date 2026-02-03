from fastapi import APIRouter
from app.schemas.document import DocumentCreate
from app.services.document_service import save_document

router = APIRouter()

@router.post("/documents")
def create_document(doc: DocumentCreate):
    return save_document(doc.title, doc.raw_text)
