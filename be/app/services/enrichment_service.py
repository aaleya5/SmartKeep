"""
Enrichment Service for async AI processing.

This service handles background tasks for:
1. Generating embeddings for semantic search
2. Auto-summarization using LLM
3. Tag suggestion using LLM
4. Reading time and difficulty calculation

All these operations are computationally expensive and run asynchronously.
"""

import logging
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models.content import Content
from app.services.embedding_service import embedding_service
from app.services.llm_service import llm_service
from app.utils.readability import analyze_readability
from app.db.session import SessionLocal
from uuid import UUID
from datetime import datetime


logger = logging.getLogger(__name__)


class EnrichmentService:
    """
    Service for async content enrichment.
    
    This handles:
    - Vector embedding generation (semantic search)
    - LLM summarization and tag suggestion
    - Reading time and readability calculation
    """
    
    @staticmethod
    def enrich_content(content_id: str) -> None:
        """
        Perform full enrichment on a content item.
        
        This method handles:
        1. Async scraping (if not already done)
        2. Readability calculation
        3. LLM summarization & tagging
        4. Vector embedding generation
        """
        from app.services.content_extractor import ContentScraper
        db = SessionLocal()
        try:
            db.execute(text("SET SESSION app.bypass_rls = 'on'"))
            content = db.query(Content).filter(Content.id == UUID(content_id)).first()
            if not content:
                logger.warning(f"Content {content_id} not found for enrichment")
                return
            
            # Step 1: Scrape content if body is missing
            if not content.body or content.body.strip() == "":
                content.enrichment_status = 'scraping'
                db.commit()
                try:
                    logger.info(f"Starting async scraping for content {content_id} from {content.source_url}")
                    # ContentScraper.scrape_url is async, but we are in a sync worker. 
                    # We need to run it in a loop.
                    import asyncio
                    data = asyncio.run(ContentScraper.scrape_url(content.source_url))
                    
                    logger.info(f"Scraping successful for {content_id}: extracted title '{data.get('title')}'")
                    content.title = data.get("title", content.title or "Untitled")
                    content.body = data.get("content", "")
                    content.author = data.get("author")
                    content.og_image_url = data.get("og_image_url")
                    content.favicon_url = data.get("favicon_url")
                    content.published_at = data.get("published_at")
                    content.word_count = len(content.body.split()) if content.body else 0
                    
                    from urllib.parse import urlparse
                    content.domain = urlparse(content.source_url).netloc
                    
                    db.commit()
                except Exception as e:
                    logger.error(f"Scraping failed for {content_id}: {str(e)}", exc_info=True)
                    content.enrichment_status = 'failed'
                    content.enrichment_error = f"Scraping failed: {str(e)}"
                    db.commit()
                    return

            # Step 2: Enriching (Readability, LLM, Embeddings)
            logger.info(f"Starting parallel enrichment for content {content_id}")
            content.enrichment_status = 'enriching'
            db.commit()
            
            # Fetch data needed for enrichment BEFORE starting parallel tasks
            content_body = content.body
            content_title = content.title
            user_id = content.user_id
            
            # Fetch existing tags for the user to provide semantic context to the LLM
            existing_tags = []
            try:
                tags_query = text("""
                    SELECT DISTINCT tag
                    FROM (
                        SELECT unnest(tags) as tag
                        FROM content
                        WHERE user_id = :user_id AND tags IS NOT NULL
                        UNION
                        SELECT unnest(suggested_tags) as tag
                        FROM content
                        WHERE user_id = :user_id AND suggested_tags IS NOT NULL
                    ) tags_combined
                    WHERE tag IS NOT NULL AND tag != ''
                """)
                tags_result = db.execute(tags_query, {"user_id": user_id})
                existing_tags = [row[0] for row in tags_result]
            except Exception as e:
                logger.error(f"Error fetching existing tags for enrichment: {e}")

            from concurrent.futures import ThreadPoolExecutor
            
            def run_readability(text_content):
                try:
                    if text_content:
                        readability = analyze_readability(text_content)
                        score = readability.get('flesch_kincaid_score')
                        return {'score': score, 'success': True}
                except Exception as e:
                    logger.error(f"Readability error {content_id}: {e}")
                return {'success': False}

            def run_llm(text_content, tags_list):
                try:
                    if text_content:
                        summary, suggested_tags_json = llm_service.summarize_and_tag(text_content, tags_list)
                        return {'summary': summary, 'tags': suggested_tags_json, 'success': True}
                except Exception as e:
                    logger.error(f"LLM error {content_id}: {e}")
                return {'success': False}

            def run_embedding(title, text_content):
                try:
                    text_to_embed = f"{title} {text_content or ''}"
                    embedding = embedding_service.embed(text_to_embed)
                    return {'embedding': embedding, 'success': True}
                except Exception as e:
                    logger.error(f"Embedding error {content_id}: {e}")
                return {'success': False}

            # Run enrichment tasks in parallel
            with ThreadPoolExecutor(max_workers=3) as executor:
                future_readability = executor.submit(run_readability, content_body)
                future_llm = executor.submit(run_llm, content_body, existing_tags)
                future_embedding = executor.submit(run_embedding, content_title, content_body)
                
                res_readability = future_readability.result()
                res_llm = future_llm.result()
                res_embedding = future_embedding.result()

            # Apply results to the model (back in the main background thread with the main session)
            if res_readability.get('success'):
                score = res_readability.get('score')
                content.readability_score = score
                if score is not None:
                    if score >= 60: content.difficulty = 'easy'
                    elif score >= 30: content.difficulty = 'intermediate'
                    else: content.difficulty = 'advanced'
            
            if res_llm.get('success'):
                if res_llm.get('summary'):
                    content.summary = res_llm.get('summary')
                if res_llm.get('tags'):
                    try:
                        import json
                        content.suggested_tags = json.loads(res_llm.get('tags'))
                    except: pass
            
            if res_embedding.get('success'):
                content.embedding = res_embedding.get('embedding')

            # Finalize
            if res_embedding.get('success') or res_readability.get('success') or res_llm.get('success'):
                content.enrichment_status = 'ready'
            else:
                content.enrichment_status = 'failed'
                content.enrichment_error = "All enrichment steps failed"
            
            content.updated_at = datetime.utcnow()
            db.commit()
            logger.info(f"Enrichment complete for content {content_id}")
            
        except Exception as e:
            logger.error(f"Error in enrichment process for {content_id}: {e}")
            try:
                db.rollback()
                content = db.query(Content).filter(Content.id == UUID(content_id)).first()
                if content:
                    content.enrichment_status = 'failed'
                    content.enrichment_error = str(e)
                    db.commit()
            except Exception:
                pass
        finally:
            db.close()
    
    @staticmethod
    def generate_embedding_only(content_id: str) -> None:
        """
        Generate embedding only (for quick semantic search indexing).
        
        Args:
            content_id: The UUID string of the content
        """
        db = SessionLocal()
        try:
            db.execute(text("SET SESSION app.bypass_rls = 'on'"))
            content = db.query(Content).filter(Content.id == UUID(content_id)).first()
            if not content:
                return
            
            text_to_embed = f"{content.title} {content.body or ''}"
            embedding = embedding_service.embed(text_to_embed)
            content.embedding = embedding
            db.commit()
            logger.info(f"Generated embedding for content {content_id}")
        except Exception as e:
            logger.error(f"Error generating embedding for content {content_id}: {e}")
        finally:
            db.close()
    
    @staticmethod
    def calculate_readability_only(content_id: str) -> None:
        """
        Calculate reading time and difficulty score only.
        
        Args:
            content_id: The UUID string of the content
        """
        db = SessionLocal()
        try:
            db.execute(text("SET SESSION app.bypass_rls = 'on'"))
            content = db.query(Content).filter(Content.id == UUID(content_id)).first()
            if not content or not content.body:
                return
            
            readability = analyze_readability(content.body)
            content.readability_score = readability.get('flesch_kincaid_score')
            
            # Determine difficulty level
            score = readability.get('flesch_kincaid_score')
            if score:
                if score >= 60:
                    content.difficulty = 'easy'
                elif score >= 30:
                    content.difficulty = 'intermediate'
                else:
                    content.difficulty = 'advanced'
            
            content.word_count = len(content.body.split())
            db.commit()
            logger.info(f"Calculated readability for content {content_id}")
        except Exception as e:
            logger.error(f"Error calculating readability for content {content_id}: {e}")
        finally:
            db.close()


# Singleton instance
enrichment_service = EnrichmentService()
