from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func, or_, and_
from app.models.content import Content
from app.services.content_extractor import ContentScraper
from app.services.enrichment_service import enrichment_service
from app.utils.readability import analyze_readability
from app.core.config import settings
from fastapi import BackgroundTasks, HTTPException
from uuid import UUID
from typing import Optional, List, Tuple
from datetime import datetime
import math
from urllib.parse import urlparse


class DuplicateURLError(Exception):
    """Raised when trying to save a URL that already exists."""
    def __init__(self, message: str, content_id: UUID = None, saved_at: datetime = None, title: str = None):
        super().__init__(message)
        self.content_id = content_id
        self.saved_at = saved_at
        self.title = title


class ContentNotFoundError(Exception):
    """Raised when content is not found."""
    pass


class ContentService:

    @staticmethod
    def create_from_url(db: Session, url: str, owner_id: str, background_tasks: BackgroundTasks = None) -> Content:
        # Check for duplicate URL
        existing = db.query(Content).filter(Content.source_url == url, Content.user_id == owner_id).first()
        if existing:
            raise DuplicateURLError(
                f"URL '{url}' has already been saved.",
                content_id=existing.id,
                saved_at=existing.created_at,
                title=existing.title
            )
        
        # Scrape the URL
        data = ContentScraper.scrape_url(url)
        
        # Parse domain from URL
        parsed_url = urlparse(url)
        domain = parsed_url.netloc
        
        # Calculate word count
        body = data.get("content", "")
        word_count = len(body.split()) if body else 0
        
        # Check if content needs truncation
        is_truncated = False
        if len(body) > settings.MAX_CONTENT_LENGTH:
            body = body[:settings.MAX_CONTENT_LENGTH] + "... [truncated]"
            is_truncated = True
            word_count = len(body.split())
        
        # Calculate readability metrics
        readability = analyze_readability(body)
        
        # Determine difficulty level
        difficulty = None
        if readability.get("flesch_kincaid_score"):
            score = readability["flesch_kincaid_score"]
            if score >= 60:
                difficulty = "easy"
            elif score >= 30:
                difficulty = "intermediate"
            else:
                difficulty = "advanced"
        
        content = Content(
            source_url=url,
            domain=domain,
            title=data.get("title", "Untitled"),
            body=body,
            author=data.get("author"),
            og_image_url=data.get("og_image_url"),
            favicon_url=data.get("favicon_url"),
            published_at=data.get("published_at"),
            word_count=word_count,
            is_truncated=is_truncated,
            tags=[],
            suggested_tags=[],
            enrichment_status="pending",
            readability_score=readability.get("flesch_kincaid_score"),
            difficulty=difficulty,
            reading_progress=0.0,
            is_read=False,
            user_id=owner_id,
        )
        
        try:
            db.add(content)
            db.commit()
            db.refresh(content)
        except IntegrityError as e:
            db.rollback()
            print(f"IntegrityError during save: {e}")
            raise DuplicateURLError(f"URL '{url}' has already been saved.")
        
        # Trigger background enrichment
        if background_tasks:
            background_tasks.add_task(enrichment_service.enrich_content, str(content.id))
        else:
            # Run synchronously for testing
            enrichment_service.enrich_content(str(content.id))
        
        return content

    @staticmethod
    def create_manual(db: Session, title: str, body: str, owner_id: str, source_url: Optional[str] = None, 
                     tags: List[str] = None, notes: str = None, background_tasks: BackgroundTasks = None) -> Content:
        # Calculate word count
        word_count = len(body.split()) if body else 0
        
        # Check if content needs truncation
        is_truncated = False
        if len(body) > settings.MAX_CONTENT_LENGTH:
            body = body[:settings.MAX_CONTENT_LENGTH] + "... [truncated]"
            is_truncated = True
            word_count = len(body.split())
        
        # Calculate readability metrics
        readability = analyze_readability(body)
        
        # Determine difficulty level
        difficulty = None
        if readability.get("flesch_kincaid_score"):
            score = readability["flesch_kincaid_score"]
            if score >= 60:
                difficulty = "easy"
            elif score >= 30:
                difficulty = "intermediate"
            else:
                difficulty = "advanced"
        
        # Parse domain if URL provided
        domain = None
        if source_url:
            parsed_url = urlparse(source_url)
            domain = parsed_url.netloc
        
        content = Content(
            title=title,
            body=body,
            source_url=source_url,
            domain=domain,
            word_count=word_count,
            is_truncated=is_truncated,
            tags=tags or [],
            notes=notes,
            suggested_tags=[],
            enrichment_status="pending",
            readability_score=readability.get("flesch_kincaid_score"),
            difficulty=difficulty,
            reading_progress=0.0,
            is_read=False,
            user_id=owner_id,
        )
        
        db.add(content)
        db.commit()
        db.refresh(content)
        
        # Trigger background enrichment
        if background_tasks:
            background_tasks.add_task(enrichment_service.enrich_content, str(content.id))
        else:
            enrichment_service.enrich_content(str(content.id))
        
        return content

    @staticmethod
    def get_by_id(db: Session, content_id: UUID, owner_id: str) -> Optional[Content]:
        content = db.query(Content).filter(Content.id == content_id, Content.user_id == owner_id).first()
        if content:
            # Update last_opened_at
            content.last_opened_at = datetime.utcnow()
            db.commit()
            db.refresh(content)
        return content

    @staticmethod
    def get_list(
        db: Session,
        owner_id: str,
        page: int = 1,
        page_size: int = 20,
        sort: str = "newest",
        tags: Optional[List[str]] = None,
        domain: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        min_reading_time: Optional[int] = None,
        max_reading_time: Optional[int] = None,
        difficulty: Optional[str] = None,
        is_read: Optional[bool] = None,
        enrichment_status: Optional[str] = None,
        is_truncated: Optional[bool] = None,
    ) -> Tuple[List[Content], int]:
        query = db.query(Content).filter(Content.user_id == owner_id)
        
        # Apply filters
        if tags:
            for tag in tags:
                query = query.filter(Content.tags.contains([tag]))
        
        if domain:
            query = query.filter(Content.domain == domain)
        
        if date_from:
            query = query.filter(Content.created_at >= date_from)
        
        if date_to:
            query = query.filter(Content.created_at <= date_to)
        
        if min_reading_time is not None:
            # word_count / 200 >= min_reading_time
            query = query.filter(Content.word_count >= min_reading_time * 200)
        
        if max_reading_time is not None:
            # word_count / 200 <= max_reading_time
            query = query.filter(Content.word_count <= max_reading_time * 200)
        
        if difficulty:
            query = query.filter(Content.difficulty == difficulty)
        
        if is_read is not None:
            query = query.filter(Content.is_read == is_read)
        
        if enrichment_status:
            query = query.filter(Content.enrichment_status == enrichment_status)
        
        if is_truncated is not None:
            query = query.filter(Content.is_truncated == is_truncated)
        
        # Get total count
        total = query.count()
        
        # Apply sorting
        if sort == "newest":
            query = query.order_by(Content.created_at.desc())
        elif sort == "oldest":
            query = query.order_by(Content.created_at.asc())
        elif sort == "last_opened":
            query = query.order_by(Content.last_opened_at.desc().nullslast())
        elif sort == "reading_time_asc":
            query = query.order_by(Content.word_count.asc())
        elif sort == "reading_time_desc":
            query = query.order_by(Content.word_count.desc())
        elif sort == "alpha_asc":
            query = query.order_by(Content.title.asc())
        elif sort == "alpha_desc":
            query = query.order_by(Content.title.desc())
        
        # Apply pagination
        offset = (page - 1) * page_size
        items = query.offset(offset).limit(page_size).all()
        
        return items, total

    @staticmethod
    def update(db: Session, content_id: UUID, owner_id: str, updates: dict) -> Content:
        content = db.query(Content).filter(Content.id == content_id, Content.user_id == owner_id).first()
        if not content:
            raise ContentNotFoundError(f"Content {content_id} not found")
        
        # Apply updates
        for key, value in updates.items():
            if value is not None and hasattr(content, key):
                setattr(content, key, value)
        
        content.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(content)
        return content

    @staticmethod
    def delete(db: Session, content_id: UUID, owner_id: str) -> bool:
        content = db.query(Content).filter(Content.id == content_id, Content.user_id == owner_id).first()
        if not content:
            raise ContentNotFoundError(f"Content {content_id} not found")
        
        db.delete(content)
        db.commit()
        return True

    @staticmethod
    def bulk_delete(db: Session, owner_id: str, content_ids: List[UUID]) -> int:
        deleted_count = db.query(Content).filter(Content.user_id == owner_id, Content.id.in_(content_ids)).delete(synchronize_session=False)
        db.commit()
        return deleted_count

    @staticmethod
    def trigger_enrichment(db: Session, content_id: UUID, owner_id: str, background_tasks: BackgroundTasks = None) -> Content:
        content = db.query(Content).filter(Content.id == content_id, Content.user_id == owner_id).first()
        if not content:
            raise ContentNotFoundError(f"Content {content_id} not found")
        
        # Reset enrichment status
        content.enrichment_status = "processing"
        content.enrichment_error = None
        db.commit()
        
        # Trigger background enrichment
        if background_tasks:
            background_tasks.add_task(enrichment_service.enrich_content, str(content.id))
        else:
            enrichment_service.enrich_content(str(content.id))
        
        return content

    @staticmethod
    def accept_tags(db: Session, content_id: UUID, owner_id: str, tags: List[str]) -> Content:
        content = db.query(Content).filter(Content.id == content_id, Content.user_id == owner_id).first()
        if not content:
            raise ContentNotFoundError(f"Content {content_id} not found")
        
        # Get valid tags (only from suggested_tags)
        valid_tags = [tag for tag in tags if tag in (content.suggested_tags or [])]
        
        # Merge into tags array
        current_tags = set(content.tags or [])
        current_tags.update(valid_tags)
        content.tags = list(current_tags)
        
        # Clear accepted tags from suggested_tags
        content.suggested_tags = [tag for tag in (content.suggested_tags or []) if tag not in valid_tags]
        
        content.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(content)
        return content

    @staticmethod
    def bulk_update_tags(db: Session, owner_id: str, content_ids: List[UUID], tags_to_add: List[str], 
                        tags_to_remove: List[str]) -> int:
        updated_count = 0
        
        for content_id in content_ids:
            content = db.query(Content).filter(Content.id == content_id, Content.user_id == owner_id).first()
            if content:
                current_tags = set(content.tags or [])
                
                # Add new tags
                current_tags.update(tags_to_add)
                
                # Remove tags
                current_tags.difference_update(tags_to_remove)
                
                content.tags = list(current_tags)
                content.updated_at = datetime.utcnow()
                updated_count += 1
        
        db.commit()
        return updated_count

    @staticmethod
    def update_reading_progress(db: Session, content_id: UUID, owner_id: str, reading_progress: float) -> Tuple[float, bool]:
        content = db.query(Content).filter(Content.id == content_id, Content.user_id == owner_id).first()
        if not content:
            raise ContentNotFoundError(f"Content {content_id} not found")
        
        content.reading_progress = reading_progress
        
        # Auto-set is_read if progress >= 0.95
        is_read = False
        if reading_progress >= 0.95:
            content.is_read = True
            is_read = True
        
        content.updated_at = datetime.utcnow()
        db.commit()
        
        return reading_progress, is_read
