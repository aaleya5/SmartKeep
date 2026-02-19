from sqlalchemy.orm import Session
from app.models.document import Document
from app.services.content_extractor import ContentScraper

class ContentService:

    @staticmethod
    def create_from_url(db: Session, url: str):
        data = ContentScraper.scrape_url(url)

        document = Document(**data)
        db.add(document)
        db.commit()
        db.refresh(document)

        return document

    @staticmethod
    def create_manual(db: Session, title: str, content: str):
        document = Document(title=title, content=content)

        db.add(document)
        db.commit()
        db.refresh(document)

        return document
