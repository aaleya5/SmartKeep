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
        
        This method is designed to be called as a background task.
        
        Args:
            content_id: The UUID string of the content to enrich
        """
        db = SessionLocal()
        try:
            content = db.query(Content).filter(Content.id == UUID(content_id)).first()
            if not content:
                logger.warning(f"Content {content_id} not found for enrichment")
                return
            
            # Update status to processing
            content.enrichment_status = 'processing'
            content.enrichment_error = None
            db.commit()
            
            # Track enrichment success/failure for each step
            embedding_success = False
            readability_success = False
            llm_success = False
            
            # Step 1: Generate embedding for semantic search
            try:
                text_to_embed = f"{content.title} {content.body or ''}"
                embedding = embedding_service.embed(text_to_embed)
                # Store directly as it is already a list
                content.embedding = embedding
                embedding_success = True
                logger.info(f"Generated embedding for content {content_id}")
            except Exception as e:
                logger.error(f"Error generating embedding for content {content_id}: {e}")
            
            # Step 2: Calculate reading time and difficulty
            try:
                if content.body:
                    readability = analyze_readability(content.body)
                    content.readability_score = readability.get('difficulty_score')
                    
                    # Determine difficulty level
                    score = readability.get('flesch_kincaid_score')
                    if score:
                        if score >= 60:
                            content.difficulty = 'easy'
                        elif score >= 30:
                            content.difficulty = 'intermediate'
                        else:
                            content.difficulty = 'advanced'
                    
                    # Recalculate word_count
                    content.word_count = len(content.body.split())
                    
                    readability_success = True
                    logger.info(f"Calculated readability for content {content_id}")
            except Exception as e:
                logger.error(f"Error calculating readability for content {content_id}: {e}")
            
            # Step 3: Generate summary and tags using LLM
            try:
                if content.body:
                    summary, suggested_tags_json = llm_service.summarize_and_tag(content.body)
                    if summary:
                        content.summary = summary
                    if suggested_tags_json:
                        # Convert JSON string to list
                        import json
                        try:
                            content.suggested_tags = json.loads(suggested_tags_json)
                        except json.JSONDecodeError:
                            pass
                    llm_success = True
                    logger.info(f"Generated LLM enrichment for content {content_id}")
            except Exception as e:
                logger.error(f"Error generating LLM enrichment for content {content_id}: {e}")
            
            # Mark enrichment status based on what succeeded
            if embedding_success or readability_success or llm_success:
                content.enrichment_status = 'complete'
            else:
                content.enrichment_status = 'failed'
                content.enrichment_error = "All enrichment steps failed"
            
            content.updated_at = datetime.utcnow()
            db.commit()
            logger.info(f"Enrichment complete for content {content_id}")
            
        except Exception as e:
            logger.error(f"Error in enrich_content for content {content_id}: {e}")
            try:
                db.rollback()
                content = db.query(Content).filter(Content.id == UUID(content_id)).first()
                if content:
                    content.enrichment_status = 'failed'
                    content.enrichment_error = str(e)
                    db.commit()
            except Exception as rollback_error:
                logger.error(f"Failed to rollback enrichment for content {content_id}: {rollback_error}")
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
