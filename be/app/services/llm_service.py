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
from typing import Tuple, Optional, List
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

    def _build_tags_prompt(self, content: str, existing_tags: List[str] = None) -> str:
        """Build prompt for tag suggestion."""
        existing_context = ""
        if existing_tags:
            existing_context = f"\nExisting tags in the user's library: {', '.join(existing_tags)}\n"

        return f"""You are a highly intelligent librarian that suggests precise, semantically relevant tags for documents.
Given the following content, suggest 3-5 relevant tags as a JSON array of strings.

{existing_context}
Guidelines:
- Priority 1: Use existing tags from the list above if they are semantically relevant to the content.
- Priority 2: Create new tags ONLY if existing tags don't cover the main topics.
- Tags should be short (1-3 words each), lowercase, with hyphens for multi-word tags.
- Focus on high-level concepts, specific entities, and domain-specific terminology.

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

    def _build_combined_prompt(self, content: str, existing_tags: List[str] = None) -> str:
        """Build a combined prompt for summary and tags."""
        existing_context = ""
        if existing_tags:
            existing_context = f"\nExisting tags in the user's library: {', '.join(existing_tags)}\n"

        return f"""You are a helpful assistant that summarizes web content and suggests precise, semantically relevant tags.
Given the following content, return a JSON object with two fields:
1. "summary": A brief 2-3 sentence summary that captures the main points.
2. "tags": A list of 3-5 relevant tags.

{existing_context}
Tag Guidelines:
- Priority 1: Use existing tags from the list above if they are semantically relevant to the content.
- Priority 2: Create new tags ONLY if existing tags don't cover the main topics.
- Tags should be short (1-3 words each), lowercase, with hyphens for multi-word tags.
- Focus on high-level concepts, specific entities, and domain-specific terminology.

Content:
{content[:4000]}

Return ONLY a JSON object. Example:
{{"summary": "This is a brief summary...", "tags": ["tag1", "tag2", "tag3"]}}"""

    def summarize_and_tag(self, content: str, existing_tags: List[str] = None) -> Tuple[Optional[str], Optional[str]]:
        """
        Generate summary and suggested tags for content in a single pass.
        
        Args:
            content: The text content to summarize and tag
            existing_tags: List of existing tags in the user's library for semantic consistency
            
        Returns:
            Tuple of (summary, suggested_tags_json) or (None, None) if failed
        """
        client = self._get_client()
        if not client:
            logger.warning("Groq client not available. Skipping LLM enrichment.")
            return None, None
        
        try:
            # Generate combined response with retry
            def create_combined():
                return client.chat.completions.create(
                    model=settings.LLM_MODEL,
                    messages=[
                        {"role": "system", "content": "You are a highly intelligent content analysis engine. Return only JSON."},
                        {"role": "user", "content": self._build_combined_prompt(content, existing_tags)}
                    ],
                    max_tokens=settings.LLM_MAX_TOKENS,
                    temperature=settings.LLM_TEMPERATURE,
                    response_format={"type": "json_object"}
                )
            
            response = self._call_api_with_retry(create_combined)
            if not response:
                return None, None
            
            result_text = response.choices[0].message.content.strip()
            result = json.loads(result_text)
            
            summary = result.get("summary")
            tags = result.get("tags", [])
            
            suggested_tags_json = None
            if tags and isinstance(tags, list):
                suggested_tags_json = json.dumps(tags)
                
            return summary, suggested_tags_json
            
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing combined LLM JSON: {e}")
        except Exception as e:
            logger.error(f"Error in combined LLM enrichment: {e}")
            
        return None, None


# Singleton instance
llm_service = LLMService()
