"""
Import Service for data import.

Handles Pocket, Raindrop, and browser bookmarks parsing.
Uses FastAPI's BackgroundTasks for non-blocking import jobs.
"""

import json
import csv
import io
import re
import uuid
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import BackgroundTasks
from app.db.session import SessionLocal
from app.models.content import Content
from app.services.content_service import ContentService, DuplicateURLError


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


class ImportService:
    """Service for importing data from external sources."""
    
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
        
        # Extract URLs and titles
        urls_to_import = []
        for item in items:
            url = item.get("resolved_url") or item.get("url", "")
            if url and url.startswith("http"):
                title = item.get("title", "")
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
        
        if not url:
            continue
        
        try:
            # Create a new session for this task
            db = SessionLocal()
            try:
                # Try to create content from URL
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
import_service = ImportService()
