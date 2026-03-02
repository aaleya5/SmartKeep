from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.document import Document
from app.services.content_extractor import ContentScraper

MAX_CONTENT_LENGTH = 10000


class DuplicateURLError(Exception):
    """Raised when trying to save a URL that already exists."""
    pass


class ContentTooLongError(Exception):
    """Raised when extracted content exceeds maximum length."""
    pass


class ContentService:

    @staticmethod
    def create_from_url(db: Session, url: str):
        # Check for duplicate URL
        existing = db.query(Document).filter(Document.source_url == url).first()
        if existing:
            raise DuplicateURLError(
                f"URL '{url}' has already been saved. "
                f"Document ID: {existing.id}, Title: {existing.title}"
            )
        
        data = ContentScraper.scrape_url(url)
        
        # Limit content length
        if len(data.get("content", "")) > MAX_CONTENT_LENGTH:
            data["content"] = data["content"][:MAX_CONTENT_LENGTH] + "... [truncated]"
        
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
        # Limit content length for manual entries too
        if len(content) > MAX_CONTENT_LENGTH:
            content = content[:MAX_CONTENT_LENGTH] + "... [truncated]"
        
        document = Document(title=title, content=content)

        db.add(document)
        db.commit()
        db.refresh(document)

        return document
