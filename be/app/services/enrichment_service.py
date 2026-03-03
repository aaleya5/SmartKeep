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
from app.models.document import Document
from app.services.embedding_service import embedding_service
from app.services.llm_service import llm_service
from app.utils.readability import analyze_readability
from app.db.session import SessionLocal


logger = logging.getLogger(__name__)


class EnrichmentService:
    """
    Service for async document enrichment.
    
    This handles:
    - Vector embedding generation (semantic search)
    - LLM summarization and tag suggestion
    - Reading time and readability calculation
    """
    
    @staticmethod
    def enrich_document(document_id: int) -> None:
        """
        Perform full enrichment on a document.
        
        This method is designed to be called as a background task.
        
        Args:
            document_id: The ID of the document to enrich
        """
        db = SessionLocal()
        try:
            document = db.query(Document).filter(Document.id == document_id).first()
            if not document:
                logger.warning(f"Document {document_id} not found for enrichment")
                return
            
            # Update status to processing
            document.enrichment_status = 'processing'
            db.commit()
            
            # Track enrichment success/failure for each step
            embedding_success = False
            readability_success = False
            llm_success = False
            
            # Step 1: Generate embedding for semantic search
            try:
                text_to_embed = f"{document.title} {document.content}"
                embedding = embedding_service.embed(text_to_embed)
                embedding_string = embedding_service.embedding_to_vector_string(embedding)
                document.embedding = embedding_string
                embedding_success = True
                logger.info(f"Generated embedding for document {document_id}")
            except Exception as e:
                logger.error(f"Error generating embedding for document {document_id}: {e}")
            
            # Step 2: Calculate reading time and difficulty
            try:
                readability = analyze_readability(document.content)
                document.reading_time = readability['reading_time']
                document.difficulty_score = readability['difficulty_score']
                readability_success = True
                logger.info(f"Calculated readability for document {document_id}: {readability['difficulty_level']}")
            except Exception as e:
                logger.error(f"Error calculating readability for document {document_id}: {e}")
            
            # Step 3: Generate summary and tags using LLM
            try:
                summary, suggested_tags = llm_service.summarize_and_tag(document.content)
                if summary:
                    document.summary = summary
                if suggested_tags:
                    document.suggested_tags = suggested_tags
                llm_success = True
                logger.info(f"Generated LLM enrichment for document {document_id}")
            except Exception as e:
                logger.error(f"Error generating LLM enrichment for document {document_id}: {e}")
            
            # Mark enrichment status based on what succeeded
            if embedding_success or readability_success or llm_success:
                document.enrichment_status = 'complete'
            else:
                document.enrichment_status = 'failed'
            
            db.commit()
            logger.info(f"Enrichment complete for document {document_id}")
            
        except Exception as e:
            logger.error(f"Error in enrich_document for document {document_id}: {e}")
            try:
                db.rollback()
                document = db.query(Document).filter(Document.id == document_id).first()
                if document:
                    document.enrichment_status = 'failed'
                    db.commit()
            except Exception as rollback_error:
                logger.error(f"Failed to rollback enrichment for document {document_id}: {rollback_error}")
        finally:
            db.close()
    
    @staticmethod
    def generate_embedding_only(document_id: int) -> None:
        """
        Generate embedding only (for quick semantic search indexing).
        
        Args:
            document_id: The ID of the document
        """
        db = SessionLocal()
        try:
            document = db.query(Document).filter(Document.id == document_id).first()
            if not document:
                return
            
            text_to_embed = f"{document.title} {document.content}"
            embedding = embedding_service.embed(text_to_embed)
            embedding_string = embedding_service.embedding_to_vector_string(embedding)
            document.embedding = embedding_string
            db.commit()
            logger.info(f"Generated embedding for document {document_id}")
        except Exception as e:
            logger.error(f"Error generating embedding for document {document_id}: {e}")
        finally:
            db.close()
    
    @staticmethod
    def calculate_readability_only(document_id: int) -> None:
        """
        Calculate reading time and difficulty score only.
        
        Args:
            document_id: The ID of the document
        """
        db = SessionLocal()
        try:
            document = db.query(Document).filter(Document.id == document_id).first()
            if not document:
                return
            
            readability = analyze_readability(document.content)
            document.reading_time = readability['reading_time']
            document.difficulty_score = readability['difficulty_score']
            db.commit()
            logger.info(f"Calculated readability for document {document_id}")
        except Exception as e:
            logger.error(f"Error calculating readability for document {document_id}: {e}")
        finally:
            db.close()


# Singleton instance
enrichment_service = EnrichmentService()
