"""
LLM Service for auto-summarization and tag suggestion.

This service uses Groq API with Llama3-8b-8192 model to:
1. Generate 2-3 sentence summaries of content
2. Suggest 3-5 relevant tags

The service runs asynchronously and doesn't block API responses.
"""

import json
import logging
import time
from typing import Tuple, Optional
from groq import Groq
from app.core.config import settings


logger = logging.getLogger(__name__)

# Retry configuration
MAX_RETRIES = 3
RETRY_DELAY_BASE = 1.0  # seconds


class LLMService:
    """
    Service for LLM-powered summarization and tag suggestion using Groq.
    
    Uses the Llama3-8b-8192 model which is fast and has a free tier.
    """
    
    def __init__(self):
        self._client = None
    
    def _get_client(self) -> Optional[Groq]:
        """Lazy-initialize the Groq client."""
        if self._client is None:
            api_key = settings.GROQ_API_KEY.get_secret_value() if settings.GROQ_API_KEY else None
            if not api_key:
                logger.warning("GROQ_API_KEY not configured. LLM enrichment will not be available.")
                return None
            self._client = Groq(api_key=api_key)
        return self._client
    
    def _build_summary_prompt(self, content: str) -> str:
        """Build prompt for summarization."""
        return f"""You are a helpful assistant that summarizes web content.
Given the following content, create a brief 2-3 sentence summary that captures the main points.

Content:
{content[:3000]}

Summary (2-3 sentences):"""

    def _build_tags_prompt(self, content: str) -> str:
        """Build prompt for tag suggestion."""
        return f"""You are a helpful assistant that suggests relevant tags for documents.
Given the following content, suggest 3-5 relevant tags as a JSON array of strings.

Tags should be:
- Short (1-3 words each)
- Relevant to the main topics
- Lowercase with hyphens for multi-word tags

Content:
{content[:3000]}

Return ONLY a JSON array, like ["tag1", "tag2", "tag3"]. No other text.:"""

    def _call_api_with_retry(self, create_func):
        """
        Call a Groq API function with exponential backoff retry.
        
        Args:
            create_func: Function that creates the API request
            
        Returns:
            API response or None if all retries fail
        """
        last_exception = None
        
        for attempt in range(MAX_RETRIES):
            try:
                return create_func()
            except Exception as e:
                last_exception = e
                if attempt < MAX_RETRIES - 1:
                    delay = RETRY_DELAY_BASE * (2 ** attempt)  # Exponential backoff
                    logger.warning(f"API call failed (attempt {attempt + 1}/{MAX_RETRIES}), retrying in {delay}s: {e}")
                    time.sleep(delay)
                else:
                    logger.error(f"API call failed after {MAX_RETRIES} attempts: {e}")
        
        return None

    def summarize_and_tag(self, content: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Generate summary and suggested tags for content.
        
        Args:
            content: The text content to summarize and tag
            
        Returns:
            Tuple of (summary, suggested_tags_json) or (None, None) if failed
        """
        client = self._get_client()
        if not client:
            logger.warning("Groq client not available. Skipping LLM enrichment.")
            return None, None
        
        summary = None
        suggested_tags = None
        
        try:
            # Generate summary with retry
            def create_summary():
                return client.chat.completions.create(
                    model=settings.LLM_MODEL,
                    messages=[
                        {"role": "system", "content": "You are a helpful assistant that summarizes web content."},
                        {"role": "user", "content": self._build_summary_prompt(content)}
                    ],
                    max_tokens=settings.LLM_MAX_TOKENS,
                    temperature=settings.LLM_TEMPERATURE
                )
            
            summary_response = self._call_api_with_retry(create_summary)
            if summary_response:
                summary = summary_response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"Error generating summary: {e}")
        
        try:
            # Generate tags with retry
            def create_tags():
                return client.chat.completions.create(
                    model=settings.LLM_MODEL,
                    messages=[
                        {"role": "system", "content": "You are a helpful assistant that suggests relevant tags."},
                        {"role": "user", "content": self._build_tags_prompt(content)}
                    ],
                    max_tokens=100,
                    temperature=settings.LLM_TEMPERATURE
                )
            
            tags_response = self._call_api_with_retry(create_tags)
            if not tags_response:
                return summary, None
            
            tags_text = tags_response.choices[0].message.content.strip()
            
            # Parse JSON array from response
            # Handle potential markdown code blocks
            if "```json" in tags_text:
                tags_text = tags_text.split("```json")[1].split("```")[0]
            elif "```" in tags_text:
                tags_text = tags_text.split("```")[1].split("```")[0]
            
            tags = json.loads(tags_text.strip())
            
            if isinstance(tags, list):
                suggested_tags = json.dumps(tags)
            
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing tags JSON: {e}")
        except Exception as e:
            logger.error(f"Error generating tags: {e}")
        
        return summary, suggested_tags


# Singleton instance
llm_service = LLMService()
