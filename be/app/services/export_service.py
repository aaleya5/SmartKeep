"""
Export Service for data export.

Handles JSON and Markdown/ZIP exports.
"""

import json
import zipfile
import io
import re
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.content import Content
from app.models.collection import Collection, ContentCollection
from app.models.annotation import Annotation
import uuid


class ExportService:
    """Service for exporting data."""
    
    @staticmethod
    def export_json(db: Session) -> Dict[str, Any]:
        """Export all data as JSON."""
        # Get all content
        contents = db.query(Content).all()
        content_data = []
        for c in contents:
            content_data.append({
                "id": str(c.id),
                "source_url": c.source_url,
                "domain": c.domain,
                "og_image_url": c.og_image_url,
                "favicon_url": c.favicon_url,
                "title": c.title,
                "author": c.author,
                "body": c.body,
                "published_at": c.published_at.isoformat() if c.published_at else None,
                "word_count": c.word_count,
                "is_truncated": c.is_truncated,
                "tags": c.tags or [],
                "notes": c.notes,
                "summary": c.summary,
                "suggested_tags": c.suggested_tags or [],
                "readability_score": c.readability_score,
                "difficulty": c.difficulty,
                "enrichment_status": c.enrichment_status,
                "reading_progress": c.reading_progress,
                "is_read": c.is_read,
                "last_opened_at": c.last_opened_at.isoformat() if c.last_opened_at else None,
                "created_at": c.created_at.isoformat(),
                "updated_at": c.updated_at.isoformat(),
            })
        
        # Get all collections
        collections = db.query(Collection).all()
        collection_data = []
        for col in collections:
            collection_data.append({
                "id": str(col.id),
                "name": col.name,
                "description": col.description,
                "color": col.color,
                "icon": col.icon,
                "is_system": col.is_system,
                "created_at": col.created_at.isoformat(),
                "updated_at": col.updated_at.isoformat(),
            })
        
        # Get all content_collections
        content_collections = db.query(ContentCollection).all()
        cc_data = []
        for cc in content_collections:
            cc_data.append({
                "content_id": str(cc.content_id),
                "collection_id": str(cc.collection_id),
                "added_at": cc.added_at.isoformat(),
            })
        
        # Get all annotations
        annotations = db.query(Annotation).all()
        annotation_data = []
        for a in annotations:
            annotation_data.append({
                "id": str(a.id),
                "content_id": str(a.content_id),
                "selected_text": a.selected_text,
                "note": a.note,
                "highlight_color": a.highlight_color,
                "position_start": a.position_start,
                "position_end": a.position_end,
                "created_at": a.created_at.isoformat(),
                "updated_at": a.updated_at.isoformat(),
            })
        
        return {
            "export_version": "1.0",
            "exported_at": datetime.utcnow().isoformat() + "Z",
            "content": content_data,
            "collections": collection_data,
            "content_collections": cc_data,
            "annotations": annotation_data,
        }
    
    @staticmethod
    def export_markdown(db: Session, collection_id: Optional[str] = None) -> bytes:
        """Export content as markdown files in a ZIP."""
        # Get content
        query = db.query(Content)
        if collection_id:
            # Filter by collection
            cc_ids = db.query(ContentCollection.content_id).filter(
                ContentCollection.collection_id == uuid.UUID(collection_id)
            ).all()
            content_ids = [c[0] for c in cc_ids]
            query = query.filter(Content.id.in_(content_ids))
        
        contents = query.all()
        
        # Create ZIP
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            for c in contents:
                # Create filename from domain and title slug
                title_slug = re.sub(r'[^a-z0-9]+', '-', c.title.lower())[:50]
                domain = re.sub(r'[^a-z0-9]+', '-', c.domain.lower())
                filename = f"{domain}_{title_slug}.md"
                
                # Build markdown content
                reading_time = (c.word_count // 200) if c.word_count else 0
                tags_str = ", ".join(c.tags) if c.tags else "none"
                
                md_content = f"""# {c.title}
**Source:** {c.source_url}
**Saved:** {c.created_at.strftime('%Y-%m-%d')}
**Tags:** {tags_str}
**Reading time:** ~{reading_time} min

## Summary
{c.summary or '(No summary available)'}

## Content
{c.body or '(No content)'}
"""
                # Add annotations if any
                annotations = db.query(Annotation).filter(Annotation.content_id == c.id).all()
                if annotations:
                    md_content += "\n## Annotations\n"
                    for a in annotations:
                        md_content += f'\n> {a.selected_text}\n'
                        if a.note:
                            md_content += f'— {a.note}\n'
                
                zf.writestr(filename, md_content)
        
        buffer.seek(0)
        return buffer.read()


# Singleton
export_service = ExportService()
