"""
Pydantic schemas for Preferences / Settings API.
"""

from pydantic import BaseModel, field_validator, ConfigDict
from typing import Optional, List
from uuid import UUID
from datetime import datetime


class PreferencesResponse(BaseModel):
    """Response schema for preferences - excludes API keys."""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    default_search_mode: str
    default_library_view: str
    default_sort_order: str
    page_size: int
    auto_enrich: bool
    llm_provider: str
    ollama_base_url: str
    max_content_length: int
    theme: str
    accent_color: str
    reader_font_size: str
    compact_density: bool
    created_at: datetime
    updated_at: datetime
    has_api_key: bool = False  # Computed field - True if groq_api_key is set
    
    @field_validator('has_api_key', mode='before')
    @classmethod
    def compute_has_api_key(cls, v, info):
        if v is not None:
            return v
        # Check if groq_api_key is set
        data = info.data
        if data.get('groq_api_key'):
            return bool(data.get('groq_api_key').strip())
        return False


class PreferencesUpdate(BaseModel):
    """Update schema for preferences - all fields optional."""
    
    # Search defaults
    default_search_mode: Optional[str] = None
    default_sort_order: Optional[str] = None
    page_size: Optional[int] = None
    
    # Library defaults
    default_library_view: Optional[str] = None
    
    # Enrichment
    auto_enrich: Optional[bool] = None
    llm_provider: Optional[str] = None
    groq_api_key: Optional[str] = None  # Only used to update, never returned
    ollama_base_url: Optional[str] = None
    max_content_length: Optional[int] = None
    
    # Appearance
    theme: Optional[str] = None
    accent_color: Optional[str] = None
    reader_font_size: Optional[str] = None
    compact_density: Optional[bool] = None


class LLMTestRequest(BaseModel):
    """Request to test LLM connection."""
    provider: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None


class LLMTestResponse(BaseModel):
    """Response for LLM test."""
    success: bool
    latency_ms: Optional[int] = None
    model: Optional[str] = None
    error: Optional[str] = None
