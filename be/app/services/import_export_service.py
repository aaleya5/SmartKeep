"""
Import/Export Service for data migration.

Handles JSON, Markdown export and Pocket, Raindrop, Bookmarks import.
Uses FastAPI's BackgroundTasks for non-blocking import jobs.
"""

import json
import csv
import zipfile
import io
import re
import uuid
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.content import Content
from app.models.collection import Collection, ContentCollection
from app.models.annotation import Annotation
from app.services.content_service import ContentService, DuplicateURLError
from fastapi import BackgroundTasks
from app.db.session import SessionLocal
from urllib.parse import urlparse


logger = logging.getLogger(__name__)

# In-memory job storage (in production, use Redis or database)
_import_jobs: Dict[str, Dict[str, Any]] = {}


class ImportJob:
    """Background import job tracking."""
    
    def __init__(self, job_id: str):
        self.job_id = job_id
        self.status = "pending"
        self.total = 0
        self.completed = 0
        self.failed = 0
        self.errors: List[Dict[str, str]] = []
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "job_id": self.job_id,
            "status": self.status,
            "total": self.total,
            "completed": self.completed,
            "failed": self.failed,
            "errors": self.errors[:100],  # Limit errors
        }


class ImportExportService:
    """Service for importing and exporting data."""
    
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
    
    @staticmethod
    def import_pocket(db: Session, file_content: bytes, background_tasks: BackgroundTasks) -> str:
        """Import Pocket export JSON."""
        try:
            data = json.loads(file_content)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON: {e}")
        
        # Pocket format: {"items": [...]} or {"list": {item_id: {...}}}
        items = data.get("list", data.get("items", []))
        if isinstance(items, dict):
            items = list(items.values())
        
        job_id = str(uuid.uuid4())
        job = ImportJob(job_id)
        job.total = len(items)
        job.status = "processing"
        _import_jobs[job_id] = job
        
        # Extract URLs and titles
        urls_to_import = []
        for item in items:
            url = item.get("resolved_url") or item.get("url", "")
            if url and url.startswith("http"):
                title = item.get("title", "")
                urls_to_import.append({"url": url, "title": title})
        
        # Update job with actual count
        job.total = len(urls_to_import)
        
        # Enqueue background task
        background_tasks.add_task(
            bulk_import_task,
            job_id,
            urls_to_import
        )
        
        return job_id
    
    @staticmethod
    def import_raindrop(db: Session, file_content: bytes, background_tasks: BackgroundTasks) -> str:
        """Import Raindrop CSV export."""
        try:
            # Try to parse as CSV
            content = file_content.decode('utf-8')
            reader = csv.DictReader(io.StringIO(content))
            rows = list(reader)
        except Exception:
            raise ValueError("Invalid CSV format")
        
        job_id = str(uuid.uuid4())
        job = ImportJob(job_id)
        
        # Extract URLs
        urls_to_import = []
        for row in rows:
            url = row.get("link") or row.get("url") or ""
            title = row.get("title", "")
            if url and url.startswith("http"):
                urls_to_import.append({"url": url, "title": title})
        
        job.total = len(urls_to_import)
        job.status = "processing"
        _import_jobs[job_id] = job
        
        # Enqueue background task
        background_tasks.add_task(
            bulk_import_task,
            job_id,
            urls_to_import
        )
        
        return job_id
    
    @staticmethod
    def import_bookmarks(db: Session, file_content: bytes, background_tasks: BackgroundTasks) -> str:
        """Import browser HTML bookmark export (Netscape format)."""
        try:
            html = file_content.decode('utf-8', errors='ignore')
        except Exception as e:
            raise ValueError(f"Invalid HTML: {e}")
        
        # Parse <a href> tags from Netscape bookmark format
        # Pattern: <A HREF="url" ADD_DATE="...">title</A>
        pattern = re.compile(r'<A\s+HREF="([^"]+)"[^>]*>([^<]*)</A>', re.IGNORECASE)
        matches = pattern.findall(html)
        
        job_id = str(uuid.uuid4())
        job = ImportJob(job_id)
        
        # Extract URLs
        urls_to_import = []
        for url, title in matches:
            if url and url.startswith('http'):
                urls_to_import.append({"url": url, "title": title})
        
        job.total = len(urls_to_import)
        job.status = "processing"
        _import_jobs[job_id] = job
        
        # Enqueue background task
        background_tasks.add_task(
            bulk_import_task,
            job_id,
            urls_to_import
        )
        
        return job_id
    
    @staticmethod
    def get_import_status(job_id: str) -> Optional[Dict[str, Any]]:
        """Get import job status."""
        job = _import_jobs.get(job_id)
        if job:
            return job.to_dict()
        return None


def bulk_import_task(job_id: str, urls: List[Dict[str, str]]) -> None:
    """
    Background task for bulk importing URLs.
    
    For each URL, calls the content save service.
    Tracks progress in import_jobs dict.
    Skips duplicates, logs failures.
    
    Args:
        job_id: The job ID for tracking
        urls: List of dicts with 'url' and optional 'title'
    """
    job = _import_jobs.get(job_id)
    if not job:
        logger.error(f"Job {job_id} not found")
        return
    
    job.status = "processing"
    logger.info(f"Starting bulk import job {job_id} with {len(urls)} URLs")
    
    for item in urls:
        url = item.get("url", "")
        title = item.get("title", "")
        
        if not url:
            continue
        
        try:
            # Create a new session for this task
            db = SessionLocal()
            try:
                # Try to create content from URL
                # Note: We don't use background_tasks here to avoid nested tasks
                # Instead, we call the service directly
                content = ContentService.create_from_url(db, url, background_tasks=None)
                job.completed += 1
                logger.debug(f"Imported: {url}")
            except DuplicateURLError:
                # Skip duplicates
                job.completed += 1
                logger.debug(f"Skipped duplicate: {url}")
            except Exception as e:
                job.failed += 1
                job.errors.append({"url": url, "error": str(e)})
                logger.warning(f"Failed to import {url}: {e}")
            finally:
                db.close()
                
        except Exception as e:
            job.failed += 1
            job.errors.append({"url": url, "error": str(e)})
            logger.error(f"Error importing {url}: {e}")
    
    job.status = "completed"
    logger.info(f"Bulk import job {job_id} completed: {job.completed} succeeded, {job.failed} failed")


# Singleton
import_export_service = ImportExportService()
