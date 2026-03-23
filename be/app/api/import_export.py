"""
Import / Export API endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.import_export import ImportResponse, ImportStatusResponse
from app.services.import_export_service import import_export_service
from uuid import UUID
from datetime import datetime
from typing import Optional
import re


router = APIRouter(prefix="", tags=["Import/Export"])


@router.get("/export/json")
def export_json(db: Session = Depends(get_db)):
    """
    Export all data as JSON.
    
    Dumps all content, collections, annotations as a single JSON object.
    Returns file download with Content-Disposition header.
    """
    data = import_export_service.export_json(db)
    json_str = json.dumps(data, indent=2)
    
    date_str = datetime.utcnow().strftime("%Y-%m-%d")
    filename = f"smartkeep-export-{date_str}.json"
    
    return StreamingResponse(
        iter([json_str]),
        media_type="application/json",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.get("/export/markdown")
def export_markdown(
    collection_id: Optional[UUID] = Query(None, description="Collection ID to export"),
    db: Session = Depends(get_db)
):
    """
    Export content as markdown files in a ZIP.
    
    One .md file per content item. Each file named {domain}_{title_slug}.md.
    If collection_id is provided, only exports items from that collection.
    """
    zip_data = import_export_service.export_markdown(
        db, 
        collection_id=str(collection_id) if collection_id else None
    )
    
    date_str = datetime.utcnow().strftime("%Y-%m-%d")
    filename = f"smartkeep-export-{date_str}.zip"
    
    return StreamingResponse(
        iter([zip_data]),
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.post("/import/pocket", response_model=ImportResponse, status_code=202)
async def import_pocket(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Pocket export JSON file"),
    db: Session = Depends(get_db)
):
    """
    Import Pocket export.
    
    Parses Pocket format JSON, enqueues each URL as a background save task.
    Returns immediately with job_id for tracking progress.
    """
    # Read file content
    content = await file.read()
    
    # Validate it's JSON
    try:
        import json
        json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid Pocket JSON format")
    
    # Queue import
    job_id = import_export_service.import_pocket(db, content, background_tasks)
    
    # Get initial job status
    job = import_export_service.get_import_status(job_id)
    
    return ImportResponse(
        queued_count=job["total"] if job else 0,
        job_id=job_id
    )


@router.post("/import/raindrop", response_model=ImportResponse, status_code=202)
async def import_raindrop(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Raindrop.io CSV export"),
    db: Session = Depends(get_db)
):
    """
    Import Raindrop.io CSV export.
    
    Parses CSV format, maps collections, enqueues saves.
    """
    # Read file content
    content = await file.read()
    
    # Queue import
    job_id = import_export_service.import_raindrop(db, content, background_tasks)
    
    # Get initial job status
    job = import_export_service.get_import_status(job_id)
    
    return ImportResponse(
        queued_count=job["total"] if job else 0,
        job_id=job_id
    )


@router.post("/import/bookmarks", response_model=ImportResponse, status_code=202)
async def import_bookmarks(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Browser HTML bookmark export"),
    db: Session = Depends(get_db)
):
    """
    Import browser HTML bookmark export (Netscape format).
    
    Parses <a href> tags from the HTML, optionally maps bookmark folders to collections.
    """
    # Read file content
    content = await file.read()
    
    # Queue import
    job_id = import_export_service.import_bookmarks(db, content, background_tasks)
    
    # Get initial job status
    job = import_export_service.get_import_status(job_id)
    
    return ImportResponse(
        queued_count=job["total"] if job else 0,
        job_id=job_id
    )


@router.get("/import/status/{job_id}", response_model=ImportStatusResponse)
def import_status(job_id: str):
    """
    Get import job status.
    
    Returns progress of a background import job.
    """
    job = import_export_service.get_import_status(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    return ImportStatusResponse(**job)


# Add json import at the top
import json
