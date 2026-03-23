"""
Pydantic schemas for Import/Export API.
"""

from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from uuid import UUID


class ImportResponse(BaseModel):
    """Response for import endpoints."""
    queued_count: int
    job_id: str


class ImportStatusResponse(BaseModel):
    """Response for import status."""
    job_id: str
    status: str  # pending, processing, completed, failed
    total: int
    completed: int
    failed: int
    errors: List[Dict[str, str]]
