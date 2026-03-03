from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.document import Document
from app.services.content_extractor import ContentScraper

MAX_CONTENT_LENGTH = 10000


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
    def create_from_url(db: Session, url: str):
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
        if len(data.get("content", "")) > MAX_CONTENT_LENGTH:
            data["content"] = data["content"][:MAX_CONTENT_LENGTH] + "... [truncated]"
            is_truncated = True
        
        data["is_truncated"] = is_truncated
        document = Document(**data)
        
        try:
            db.add(document)
            db.commit()
            db.refresh(document)
        except IntegrityError:
            db.rollback()
            raise DuplicateURLError(f"URL '{url}' has already been saved.")

        return document

    @staticmethod
    def create_manual(db: Session, title: str, content: str):
        # Check if content needs truncation
        is_truncated = False
        if len(content) > MAX_CONTENT_LENGTH:
            content = content[:MAX_CONTENT_LENGTH] + "... [truncated]"
            is_truncated = True
        
        document = Document(title=title, content=content, is_truncated=is_truncated)

        db.add(document)
        db.commit()
        db.refresh(document)

        return document
