"""
Collection Service for managing document collections.

This service provides business logic for:
- Creating, updating, deleting collections
- Adding/removing documents from collections
- Listing collections with document counts
"""

import logging
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.collection import Collection, ContentCollection
from app.models.document import Document


logger = logging.getLogger(__name__)


class CollectionService:
    """Service for managing document collections."""
    
    @staticmethod
    def create_collection(
        db: Session,
        name: str,
        description: Optional[str] = None,
        color: str = "#6366f1"
    ) -> Collection:
        """
        Create a new collection.
        
        Args:
            db: Database session
            name: Collection name
            description: Optional description
            color: Hex color for the collection
            
        Returns:
            Created collection
        """
        collection = Collection(
            name=name,
            description=description,
            color=color
        )
        db.add(collection)
        db.commit()
        db.refresh(collection)
        
        logger.info(f"Created collection: {collection.name} (ID: {collection.id})")
        return collection
    
    @staticmethod
    def get_collection(db: Session, collection_id: int) -> Optional[Collection]:
        """
        Get a collection by ID.
        
        Args:
            db: Database session
            collection_id: Collection ID
            
        Returns:
            Collection or None if not found
        """
        return db.query(Collection).filter(Collection.id == collection_id).first()
    
    @staticmethod
    def get_collection_document_count(db: Session, collection_id: int) -> int:
        """
        Get the document count for a collection.
        
        Args:
            db: Database session
            collection_id: Collection ID
            
        Returns:
            Number of documents in the collection
        """
        from sqlalchemy import func
        from app.models.collection import ContentCollection
        
        count = db.query(func.count(ContentCollection.document_id)).filter(
            ContentCollection.collection_id == collection_id
        ).scalar()
        
        return count or 0
    
    @staticmethod
    def list_collections(db: Session) -> List[Collection]:
        """
        List all collections with document counts.
        
        Args:
            db: Database session
            
        Returns:
            List of collections
        """
        # Use subquery to get document_count for each collection
        from sqlalchemy import func
        from app.models.collection import ContentCollection
        
        # Subquery to count documents per collection
        count_subquery = (
            db.query(
                ContentCollection.collection_id,
                func.count(ContentCollection.document_id).label('document_count')
            )
            .group_by(ContentCollection.collection_id)
            .subquery()
        )
        
        # Query collections with document count from subquery
        collections = (
            db.query(Collection, func.coalesce(count_subquery.c.document_count, 0).label('doc_count'))
            .outerjoin(count_subquery, Collection.id == count_subquery.c.collection_id)
            .order_by(Collection.created_at.desc())
            .all()
        )
        
        # Attach document_count to each collection object (hack for compatibility)
        # In a real app, you'd use a DTO or schema that includes this
        for collection, doc_count in collections:
            collection._document_count = doc_count
        
        return [c for c, _ in collections]
    
    @staticmethod
    def update_collection(
        db: Session,
        collection_id: int,
        name: Optional[str] = None,
        description: Optional[str] = None,
        color: Optional[str] = None
    ) -> Optional[Collection]:
        """
        Update a collection.
        
        Args:
            db: Database session
            collection_id: Collection ID
            name: New name (optional, only included if explicitly set)
            description: New description (optional, only included if explicitly set)
            color: New color (optional, only included if explicitly set)
            
        Returns:
            Updated collection or None if not found
        """
        collection = db.query(Collection).filter(Collection.id == collection_id).first()
        if not collection:
            return None
        
        # Only update fields that were explicitly provided
        # Use a sentinel value to detect if field was provided (even as None)
        # But since we use exclude_unset=True from API, we can check with 'is not None'
        if name is not None:
            collection.name = name
        if description is not None:
            collection.description = description
        if color is not None:
            collection.color = color
        
        db.commit()
        db.refresh(collection)
        
        logger.info(f"Updated collection: {collection.name} (ID: {collection.id})")
        return collection
    
    @staticmethod
    def delete_collection(db: Session, collection_id: int) -> bool:
        """
        Delete a collection.
        
        Args:
            db: Database session
            collection_id: Collection ID
            
        Returns:
            True if deleted, False if not found
        """
        collection = db.query(Collection).filter(Collection.id == collection_id).first()
        if not collection:
            return False
        
        db.delete(collection)
        db.commit()
        
        logger.info(f"Deleted collection ID: {collection_id}")
        return True
    
    @staticmethod
    def add_document_to_collection(
        db: Session,
        collection_id: int,
        document_id: int
    ) -> Optional[ContentCollection]:
        """
        Add a document to a collection.
        
        Args:
            db: Database session
            collection_id: Collection ID
            document_id: Document ID
            
        Returns:
            Created ContentCollection entry or None if already exists
        """
        # Check if collection exists
        collection = db.query(Collection).filter(Collection.id == collection_id).first()
        if not collection:
            logger.warning(f"Collection {collection_id} not found")
            return None
        
        # Check if document exists
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            logger.warning(f"Document {document_id} not found")
            return None
        
        # Check if already in collection
        existing = db.query(ContentCollection).filter(
            ContentCollection.collection_id == collection_id,
            ContentCollection.document_id == document_id
        ).first()
        
        if existing:
            logger.info(f"Document {document_id} already in collection {collection_id}")
            return existing
        
        # Create the relationship
        content_collection = ContentCollection(
            collection_id=collection_id,
            document_id=document_id
        )
        db.add(content_collection)
        
        try:
            db.commit()
            db.refresh(content_collection)
            logger.info(f"Added document {document_id} to collection {collection_id}")
            return content_collection
        except IntegrityError:
            db.rollback()
            logger.warning(f"Document {document_id} already in collection {collection_id}")
            return None
    
    @staticmethod
    def remove_document_from_collection(
        db: Session,
        collection_id: int,
        document_id: int
    ) -> bool:
        """
        Remove a document from a collection.
        
        Args:
            db: Database session
            collection_id: Collection ID
            document_id: Document ID
            
        Returns:
            True if removed, False if not found
        """
        content_collection = db.query(ContentCollection).filter(
            ContentCollection.collection_id == collection_id,
            ContentCollection.document_id == document_id
        ).first()
        
        if not content_collection:
            return False
        
        db.delete(content_collection)
        db.commit()
        
        logger.info(f"Removed document {document_id} from collection {collection_id}")
        return True
    
    @staticmethod
    def get_documents_in_collection(
        db: Session,
        collection_id: int
    ) -> List[Document]:
        """
        Get all documents in a collection.
        
        Args:
            db: Database session
            collection_id: Collection ID
            
        Returns:
            List of documents in the collection
        """
        collection = db.query(Collection).filter(Collection.id == collection_id).first()
        if not collection:
            return []
        
        # Get all content_collections for this collection
        content_collections = db.query(ContentCollection).filter(
            ContentCollection.collection_id == collection_id
        ).all()
        
        # Get document IDs
        document_ids = [cc.document_id for cc in content_collections]
        
        # Fetch documents
        if not document_ids:
            return []
        
        documents = db.query(Document).filter(Document.id.in_(document_ids)).all()
        return documents
    
    @staticmethod
    def get_collections_for_document(
        db: Session,
        document_id: int
    ) -> List[Collection]:
        """
        Get all collections that contain a specific document.
        
        Args:
            db: Database session
            document_id: Document ID
            
        Returns:
            List of collections containing the document
        """
        content_collections = db.query(ContentCollection).filter(
            ContentCollection.document_id == document_id
        ).all()
        
        collection_ids = [cc.collection_id for cc in content_collections]
        
        if not collection_ids:
            return []
        
        collections = db.query(Collection).filter(Collection.id.in_(collection_ids)).all()
        return collections


# Singleton instance
collection_service = CollectionService()
