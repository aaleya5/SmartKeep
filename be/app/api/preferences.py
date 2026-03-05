"""
Preferences / Settings API endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.preferences import (
    PreferencesResponse,
    PreferencesUpdate,
    LLMTestRequest,
    LLMTestResponse,
)
from app.models.preferences import Preferences
import httpx
import time


router = APIRouter(prefix="/preferences", tags=["Preferences"])


def _build_response(prefs: Preferences) -> PreferencesResponse:
    """Build response with has_api_key computed field."""
    response_data = {
        "id": prefs.id,
        "default_search_mode": prefs.default_search_mode,
        "default_library_view": prefs.default_library_view,
        "default_sort_order": prefs.default_sort_order,
        "page_size": prefs.page_size,
        "auto_enrich": prefs.auto_enrich,
        "llm_provider": prefs.llm_provider,
        "ollama_base_url": prefs.ollama_base_url,
        "max_content_length": prefs.max_content_length,
        "theme": prefs.theme,
        "accent_color": prefs.accent_color,
        "reader_font_size": prefs.reader_font_size,
        "compact_density": prefs.compact_density,
        "created_at": prefs.created_at,
        "updated_at": prefs.updated_at,
    }
    return PreferencesResponse(**response_data)


@router.get("", response_model=PreferencesResponse)
def get_preferences(db: Session = Depends(get_db)):
    """
    Get current preferences.
    
    Returns all preferences except groq_api_key.
    Instead, returns has_api_key: bool to indicate if an API key is configured.
    """
    prefs = Preferences.get_or_create(db)
    return _build_response(prefs)


@router.put("", response_model=PreferencesResponse)
def update_preferences(request: PreferencesUpdate, db: Session = Depends(get_db)):
    """
    Update preferences.
    
    Accepts partial update - any subset of fields can be updated.
    """
    prefs = Preferences.get_or_create(db)
    
    # Apply updates
    update_data = request.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        if value is not None and hasattr(prefs, key):
            setattr(prefs, key, value)
    
    db.commit()
    db.refresh(prefs)
    
    return _build_response(prefs)


@router.post("/test-llm", response_model=LLMTestResponse)
def test_llm(request: LLMTestRequest, db: Session = Depends(get_db)):
    """
    Test LLM connection.
    
    Sends a test prompt to the configured LLM provider to verify
    connectivity and API key validity.
    
    Returns:
    - 200: { "success": true, "latency_ms": 234, "model": "llama3-8b-8192" }
    - 400: { "success": false, "error": "Invalid API key" }
    """
    provider = request.provider
    api_key = request.api_key
    base_url = request.base_url
    
    # If not provided in request, get from preferences
    if api_key is None or base_url is None:
        prefs = Preferences.get_or_create(db)
        if api_key is None:
            api_key = prefs.groq_api_key
        if base_url is None and provider == 'ollama':
            base_url = prefs.ollama_base_url
    
    if provider == 'groq':
        return _test_groq(api_key)
    elif provider == 'ollama':
        return _test_ollama(base_url)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")


def _test_groq(api_key: str) -> LLMTestResponse:
    """Test Groq API connection."""
    if not api_key or not api_key.strip():
        return LLMTestResponse(success=False, error="API key is required")
    
    start_time = time.time()
    
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "llama3-8b-8192",
                    "messages": [{"role": "user", "content": "Say 'OK' if you receive this."}],
                    "max_tokens": 10,
                }
            )
            
            latency = int((time.time() - start_time) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                model = data.get("model", "llama3-8b-8192")
                return LLMTestResponse(success=True, latency_ms=latency, model=model)
            elif response.status_code == 401:
                return LLMTestResponse(success=False, error="Invalid API key")
            else:
                error_msg = response.text[:200]
                return LLMTestResponse(success=False, error=f"API error: {error_msg}")
                
    except httpx.TimeoutException:
        return LLMTestResponse(success=False, error="Request timed out")
    except Exception as e:
        return LLMTestResponse(success=False, error=str(e))


def _test_ollama(base_url: str) -> LLMTestResponse:
    """Test Ollama connection."""
    if not base_url:
        base_url = "http://localhost:11434"
    
    start_time = time.time()
    
    try:
        with httpx.Client(timeout=30.0) as client:
            # First check if Ollama is running
            response = client.get(f"{base_url}/api/tags")
            
            if response.status_code != 200:
                return LLMTestResponse(success=False, error="Ollama not running")
            
            # Try a simple generation
            response = client.post(
                f"{base_url}/api/generate",
                json={
                    "model": "llama3",
                    "prompt": "Say 'OK'",
                    "stream": False,
                }
            )
            
            latency = int((time.time() - start_time) * 1000)
            
            if response.status_code == 200:
                return LLMTestResponse(success=True, latency_ms=latency, model="llama3")
            else:
                return LLMTestResponse(success=False, error=f"Generation failed: {response.text[:100]}")
                
    except httpx.ConnectError:
        return LLMTestResponse(success=False, error="Cannot connect to Ollama - is it running?")
    except httpx.TimeoutException:
        return LLMTestResponse(success=False, error="Request timed out")
    except Exception as e:
        return LLMTestResponse(success=False, error=str(e))
