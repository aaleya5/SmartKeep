"""
Background Task Architecture.

This module provides background task functions for FastAPI's BackgroundTasks.
All long-running work is non-blocking.

For simple cases, we use FastAPI's BackgroundTasks directly.
For production with high load, consider using Redis + Celery.
"""

import logging
from uuid import UUID
from typing import List, Dict, Any
from app.services.enrichment_service import enrichment_service
from app.services.import_export_service import bulk_import_task

logger = logging.getLogger(__name__)


def enrich_content_task(content_id: UUID) -> None:
    """
    Background task for content enrichment.
    
    This task:
    1. Fetches content record from DB
    2. Sets enrichment_status = "processing"
    3. Calls EmbeddingService.embed(title + " " + body[:2000]) → stores in embedding
    4. Calls LLMService.summarize(title, body) → stores in summary
    5. Calls LLMService.suggest_tags(title, body, existing_tags) → stores in suggested_tags
    6. Computes Flesch-Kincaid score → stores in readability_score, derives difficulty
    7. Sets enrichment_status = "complete"
    8. On any exception: sets enrichment_status = "failed", stores error in enrichment_error
    
    Args:
        content_id: UUID of the content to enrich
    """
    logger.info(f"Starting enrichment task for content {content_id}")
    try:
        enrichment_service.enrich_content(str(content_id))
        logger.info(f"Enrichment task completed for content {content_id}")
    except Exception as e:
        logger.error(f"Enrichment task failed for content {content_id}: {e}")


def bulk_import_task_wrapper(job_id: str, urls: List[Dict[str, Any]]) -> None:
    """
    Background task for bulk importing URLs.
    
    This task:
    1. For each URL, calls the content save service
    2. Tracks progress in a import_jobs dict (or Redis key in production)
    3. Skips duplicates, logs failures
    
    Args:
        job_id: UUID string for tracking the import job
        urls: List of dicts with 'url' and optional 'title'
    """
    logger.info(f"Starting bulk import task for job {job_id} with {len(urls)} URLs")
    try:
        bulk_import_task(job_id, urls)
        logger.info(f"Bulk import task completed for job {job_id}")
    except Exception as e:
        logger.error(f"Bulk import task failed for job {job_id}: {e}")
