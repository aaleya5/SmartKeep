from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.document import Document
from app.services.content_extractor import ContentScraper
from app.services.enrichment_service import enrichment_service
from app.utils.readability import analyze_readability
from app.core.config import settings
from fastapi import BackgroundTasks


class DuplicateURLError(Exception):
    """Raised when trying to save a URL that already exists."""
    def __init__(self, message: str, document_id: int = None, saved_date: str = None, title: str = None):
        super().__init__(message)
        self.document_id = document_id
        self.saved_date = saved_date
        self.title = title


class ContentTooLongError(Exception):
    """Raised when extracted content exceeds maximum length."""
    pass


class ContentService:

    @staticmethod
    def create_from_url(db: Session, url: str, background_tasks: BackgroundTasks = None):
        # Check for duplicate URL
        existing = db.query(Document).filter(Document.source_url == url).first()
        if existing:
            saved_date = existing.created_at.strftime("%B %d, %Y") if existing.created_at else "unknown date"
            raise DuplicateURLError(
                f"URL '{url}' has already been saved. "
                f"Document ID: {existing.id}, Title: {existing.title}, Saved on: {saved_date}",
                document_id=existing.id,
                saved_date=saved_date,
                title=existing.title
            )
        
        data = ContentScraper.scrape_url(url)
        
        # Check if content needs truncation
        is_truncated = False
        if len(data.get("content", "")) > settings.MAX_CONTENT_LENGTH:
            data["content"] = data["content"][:MAX_CONTENT_LENGTH] + "... [truncated]"
            is_truncated = True
        
        data["is_truncated"] = is_truncated
        
        # Calculate initial reading metrics (synchronous, fast)
        readability = analyze_readability(data.get("content", ""))
        data["reading_time"] = readability["reading_time"]
        data["difficulty_score"] = readability["difficulty_score"]
        
        # Set initial enrichment status
        data["enrichment_status"] = "pending"
        
        document = Document(**data)
        
        try:
            db.add(document)
            db.commit()
            db.refresh(document)
        except IntegrityError:
            db.rollback()
            raise DuplicateURLError(f"URL '{url}' has already been saved.")

        # Trigger background enrichment (non-blocking)
        if background_tasks:
            background_tasks.add_task(enrichment_service.enrich_document, document.id)
        else:
            # If no background tasks provided, run synchronously for testing
            enrichment_service.enrich_document(document.id)

        return document

    @staticmethod
    def create_manual(db: Session, title: str, content: str, background_tasks: BackgroundTasks = None):
        # Check if content needs truncation
        is_truncated = False
        if len(content) > settings.MAX_CONTENT_LENGTH:
            content = content[:settings.MAX_CONTENT_LENGTH] + "... [truncated]"
            is_truncated = True
        
        # Calculate initial reading metrics (synchronous, fast)
        readability = analyze_readability(content)
        
        document = Document(
            title=title, 
            content=content, 
            is_truncated=is_truncated,
            reading_time=readability["reading_time"],
            difficulty_score=readability["difficulty_score"],
            enrichment_status="pending"
        )

        db.add(document)
        db.commit()
        db.refresh(document)

        # Trigger background enrichment (non-blocking)
        if background_tasks:
            background_tasks.add_task(enrichment_service.enrich_document, document.id)
        else:
            # If no background tasks provided, run synchronously for testing
            enrichment_service.enrich_document(document.id)

        return document
    
    @staticmethod
    def trigger_enrichment(db: Session, document_id: int) -> Document:
        """
        Manually trigger enrichment for a document.
        
        Args:
            db: Database session
            document_id: ID of the document to re-enrich
            
        Returns:
            Updated document
        """
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise ValueError(f"Document {document_id} not found")
        
        # Reset enrichment status
        document.enrichment_status = "pending"
        db.commit()
        
        # Trigger background enrichment
        enrichment_service.enrich_document(document_id)
        
        return document
