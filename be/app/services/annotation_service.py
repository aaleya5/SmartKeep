"""
Annotation Service for managing content annotations.
"""

import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.annotation import Annotation
from app.models.content import Content
from app.models.collection import ContentCollection
from uuid import UUID
from datetime import datetime
import json

logger = logging.getLogger(__name__)


class AnnotationService:
    """Service for managing content annotations."""
    
    @staticmethod
    def create_annotation(
        db: Session,
        content_id: UUID,
        selected_text: str,
        note: Optional[str] = None,
        color: str = "yellow",
        position_start: Optional[int] = None,
        position_end: Optional[int] = None,
    ) -> Optional[Annotation]:
        """Create an annotation on content."""
        # Verify content exists
        content = db.query(Content).filter(Content.id == content_id).first()
        if not content:
            logger.warning(f"Content {content_id} not found")
            return None
        
        annotation = Annotation(
            content_id=content_id,
            selected_text=selected_text,
            note=note,
            color=color,
            position_start=position_start,
            position_end=position_end,
        )
        db.add(annotation)
        db.commit()
        db.refresh(annotation)
        
        logger.info(f"Created annotation {annotation.id} on content {content_id}")
        return annotation
    
    @staticmethod
    def get_annotation(db: Session, annotation_id: UUID) -> Optional[Annotation]:
        """Get an annotation by ID."""
        return db.query(Annotation).filter(Annotation.id == annotation_id).first()
    
    @staticmethod
    def get_annotations_for_content(
        db: Session,
        content_id: UUID
    ) -> List[Annotation]:
        """Get all annotations for a content item, ordered by position_start."""
        return db.query(Annotation).filter(
            Annotation.content_id == content_id
        ).order_by(Annotation.position_start.asc().nullslast()).all()
    
    @staticmethod
    def update_annotation(
        db: Session,
        annotation_id: UUID,
        note: Optional[str] = None,
        color: Optional[str] = None,
    ) -> Optional[Annotation]:
        """Update an annotation."""
        annotation = db.query(Annotation).filter(Annotation.id == annotation_id).first()
        if not annotation:
            return None
        
        if note is not None:
            annotation.note = note
        if color is not None:
            annotation.color = color
        
        annotation.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(annotation)
        
        logger.info(f"Updated annotation {annotation_id}")
        return annotation
    
    @staticmethod
    def delete_annotation(db: Session, annotation_id: UUID) -> bool:
        """Delete an annotation."""
        annotation = db.query(Annotation).filter(Annotation.id == annotation_id).first()
        if not annotation:
            return False
        
        db.delete(annotation)
        db.commit()
        
        logger.info(f"Deleted annotation {annotation_id}")
        return True
    
    @staticmethod
    def list_annotations(
        db: Session,
        owner_id: str,
        color: Optional[str] = None,
        content_tags: Optional[List[str]] = None,
        domain: Optional[str] = None,
        collection_id: Optional[UUID] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        sort: str = "newest",
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[List[Dict[str, Any]], int]:
        """List all annotations with optional filters."""
        
        # Build query with joins
        query = db.query(Annotation).join(Content, Annotation.content_id == Content.id)
        
        # Filter by owner_id
        query = query.filter(Content.user_id == owner_id)
        
        # Apply filters
        if color:
            query = query.filter(Annotation.color == color)
        
        if content_tags and len(content_tags) > 0:
            # Filter by tags on parent content
            for tag in content_tags:
                query = query.filter(Content.tags.contains([tag]))
        
        if domain:
            query = query.filter(Content.domain == domain)
        
        if collection_id:
            # Filter by content in a collection
            query = query.join(
                ContentCollection,
                Content.id == ContentCollection.content_id
            ).filter(ContentCollection.collection_id == collection_id)
        
        if date_from:
            query = query.filter(Annotation.created_at >= date_from)
        
        if date_to:
            query = query.filter(Annotation.created_at <= date_to)
        
        # Get total count
        total = query.count()
        
        # Apply sorting
        if sort == "newest":
            query = query.order_by(Annotation.created_at.desc())
        elif sort == "oldest":
            query = query.order_by(Annotation.created_at.asc())
        elif sort == "source_title":
            query = query.order_by(Content.title.asc())
        
        # Apply pagination
        offset = (page - 1) * page_size
        annotations = query.offset(offset).limit(page_size).all()
        
        # Build response with content info
        result = []
        for ann in annotations:
            content = db.query(Content).filter(Content.id == ann.content_id).first()
            if content:
                result.append({
                    'id': str(ann.id),          # Must be str so UUID() in the API works
                    'content_id': ann.content_id,
                    'selected_text': ann.selected_text,
                    'note': ann.note,
                    'color': ann.color,
                    'position_start': ann.position_start,
                    'position_end': ann.position_end,
                    'created_at': ann.created_at,
                    'updated_at': ann.updated_at,
                    'content_title': content.title or '',
                    'content_domain': content.domain or '',
                    'content_favicon_url': content.favicon_url,
                    'content_tags': content.tags or [],
                })
        
        return result, total
    
    @staticmethod
    def export_annotations(
        db: Session,
        format: str = "markdown",
    ) -> str:
        """Export all annotations in the specified format."""
        
        # Get all annotations with content info
        annotations = db.query(Annotation).join(Content).all()
        
        # Group by content
        grouped: Dict[UUID, List[Annotation]] = {}
        for ann in annotations:
            if ann.content_id not in grouped:
                grouped[ann.content_id] = []
            grouped[ann.content_id].append(ann)
        
        if format == "json":
            result = []
            for content_id, anns in grouped.items():
                content = db.query(Content).filter(Content.id == content_id).first()
                if content:
                    result.append({
                        'content_id': str(content_id),
                        'title': content.title,
                        'url': content.source_url,
                        'domain': content.domain,
                        'annotations': [
                            {
                                'selected_text': a.selected_text,
                                'note': a.note,
                                'color': a.color,
                                'created_at': a.created_at.isoformat(),
                            }
                            for a in anns
                        ]
                    })
            return json.dumps(result, indent=2)
        
        # Markdown format (default)
        lines = ["# SmartKeep Annotations\n"]
        
        for content_id, anns in grouped.items():
            content = db.query(Content).filter(Content.id == content_id).first()
            if not content:
                continue
            
            lines.append(f"## [{content.title}]({content.source_url})")
            lines.append(f"*Domain: {content.domain}*\n")
            
            for ann in sorted(anns, key=lambda a: a.position_start or 0):
                color_emoji = {
                    'yellow': '🟨',
                    'green': '🟩',
                    'pink': '🩷',
                    'blue': '🟦',
                }.get(ann.color, '🟨')
                
                lines.append(f"- {color_emoji} \"{ann.selected_text}\"")
                if ann.note:
                    lines.append(f"  - *Note:* {ann.note}")
                lines.append("")
            
            lines.append("---\n")
        
        return '\n'.join(lines)


# Singleton instance
annotation_service = AnnotationService()
