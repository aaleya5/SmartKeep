"""
Collection Service for managing document collections.

This service provides business logic for:
- Creating, updating, deleting collections
- Adding/removing documents from collections
- Listing collections with document counts
- Reordering collections
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
        color: str = "#6366f1",
        icon: str = "📁",
        is_pinned: bool = False
    ) -> Collection:
        """
        Create a new collection.
        
        Args:
            db: Database session
            name: Collection name
            description: Optional description
            color: Hex color for the collection
            icon: Emoji or icon for the collection
            is_pinned: Whether to pin the collection
            
        Returns:
            Created collection
        """
        # Get max sort_order for pinned or unpinned
        max_order = db.query(Collection.sort_order).order_by(Collection.sort_order.desc()).first()
        next_order = (max_order[0] + 1) if max_order else 0
        
        collection = Collection(
            name=name,
            description=description,
            color=color,
            icon=icon,
            is_pinned=is_pinned,
            sort_order=next_order
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
    def get_collection_by_uuid(db: Session, collection_uuid: str) -> Optional[Collection]:
        """
        Get a collection by UUID.
        
        Args:
            db: Database session
            collection_uuid: Collection UUID
            
        Returns:
            Collection or None if not found
        """
        return db.query(Collection).filter(Collection.uuid == collection_uuid).first()
    
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
        
        count = db.query(func.count(ContentCollection.document_id)).filter(
            ContentCollection.collection_id == collection_id
        ).scalar()
        
        return count or 0
    
    @staticmethod
    def list_collections(
        db: Session,
        include_empty: bool = True,
        sort: str = "newest"
    ) -> List[Collection]:
        """
        List all collections with document counts.
        
        Args:
            db: Database session
            include_empty: Whether to include collections with no documents
            sort: Sort order - 'name', 'newest', 'item_count', 'manual'
            
        Returns:
            List of collections
        """
        from sqlalchemy import func
        
        # Subquery to count documents per collection
        count_subquery = (
            db.query(
                ContentCollection.collection_id,
                func.count(ContentCollection.document_id).label('document_count')
            )
            .group_by(ContentCollection.collection_id)
            .subquery()
        )
        
        # Determine sort order
        if sort == "name":
            order_by = Collection.name.asc()
        elif sort == "newest":
            order_by = Collection.created_at.desc()
        elif sort == "item_count":
            order_by = func.coalesce(count_subquery.c.document_count, 0).desc()
        elif sort == "manual":
            # Pinned first, then by sort_order
            order_by = Collection.is_pinned.desc(), Collection.sort_order.asc()
        else:
            order_by = Collection.created_at.desc()
        
        # Query collections with document count from subquery
        # Pinned collections always come first regardless of sort
        collections = (
            db.query(Collection, func.coalesce(count_subquery.c.document_count, 0).label('doc_count'))
            .outerjoin(count_subquery, Collection.id == count_subquery.c.collection_id)
            .order_by(Collection.is_pinned.desc(), order_by)
            .all()
        )
        
        # Filter out empty collections if requested
        if not include_empty:
            collections = [(c, dc) for c, dc in collections if dc > 0]
        
        # Attach document_count to each collection object (hack for compatibility)
        for collection, doc_count in collections:
            collection._document_count = doc_count
        
        return [c for c, _ in collections]
    
    @staticmethod
    def reorder_collections(
        db: Session,
        ordered_ids: List[int]
    ) -> bool:
        """
        Reorder collections based on provided order.
        
        Args:
            db: Database session
            ordered_ids: List of collection IDs in desired order
            
        Returns:
            True if successful
        """
        for index, collection_id in enumerate(ordered_ids):
            collection = db.query(Collection).filter(Collection.id == collection_id).first()
            if collection:
                collection.sort_order = index
        
        db.commit()
        logger.info(f"Reordered {len(ordered_ids)} collections")
        return True
    
    @staticmethod
    def update_collection(
        db: Session,
        collection_id: int,
        name: Optional[str] = None,
        description: Optional[str] = None,
        color: Optional[str] = None,
        icon: Optional[str] = None,
        is_pinned: Optional[bool] = None,
        sort_order: Optional[int] = None
    ) -> Optional[Collection]:
        """
        Update a collection.
        
        Args:
            db: Database session
            collection_id: Collection ID
            name: New name (optional, only included if explicitly set)
            description: New description (optional, only included if explicitly set)
            color: New color (optional, only included if explicitly set)
            icon: New icon (optional, only included if explicitly set)
            is_pinned: New pinned status (optional)
            sort_order: New sort order (optional)
            
        Returns:
            Updated collection or None if not found
        """
        collection = db.query(Collection).filter(Collection.id == collection_id).first()
        if not collection:
            return None
        
        # Only update fields that were explicitly provided
        if name is not None:
            collection.name = name
        if description is not None:
            collection.description = description
        if color is not None:
            collection.color = color
        if icon is not None:
            collection.icon = icon
        if is_pinned is not None:
            collection.is_pinned = is_pinned
        if sort_order is not None:
            collection.sort_order = sort_order
        
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
    def add_documents_to_collection(
        db: Session,
        collection_id: int,
        document_ids: List[int]
    ) -> dict:
        """
        Add multiple documents to a collection.
        
        Args:
            db: Database session
            collection_id: Collection ID
            document_ids: List of Document IDs to add
            
        Returns:
            Dict with 'added_count' and 'already_present' counts
        """
        # Check if collection exists
        collection = db.query(Collection).filter(Collection.id == collection_id).first()
        if not collection:
            logger.warning(f"Collection {collection_id} not found")
            return {"added_count": 0, "already_present": 0}
        
        added_count = 0
        already_present = 0
        
        for document_id in document_ids:
            # Check if document exists
            document = db.query(Document).filter(Document.id == document_id).first()
            if not document:
                continue
            
            # Check if already in collection
            existing = db.query(ContentCollection).filter(
                ContentCollection.collection_id == collection_id,
                ContentCollection.document_id == document_id
            ).first()
            
            if existing:
                already_present += 1
                continue
            
            # Create the relationship
            content_collection = ContentCollection(
                collection_id=collection_id,
                document_id=document_id
            )
            db.add(content_collection)
            added_count += 1
        
        try:
            db.commit()
            logger.info(f"Added {added_count} documents to collection {collection_id}")
        except IntegrityError:
            db.rollback()
            logger.warning(f"Some documents already in collection {collection_id}")
        
        return {"added_count": added_count, "already_present": already_present}
    
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
        collection_id: int,
        limit: int = 100,
        offset: int = 0
    ) -> List[Document]:
        """
        Get all documents in a collection with pagination.
        
        Args:
            db: Database session
            collection_id: Collection ID
            limit: Maximum number of documents to return
            offset: Number of documents to skip
            
        Returns:
            List of documents in the collection
        """
        collection = db.query(Collection).filter(Collection.id == collection_id).first()
        if not collection:
            return []
        
        # Get all content_collections for this collection
        content_collections = db.query(ContentCollection).filter(
            ContentCollection.collection_id == collection_id
        ).order_by(ContentCollection.created_at.desc()).offset(offset).limit(limit).all()
        
        # Get document IDs
        document_ids = [cc.document_id for cc in content_collections]
        
        # Fetch documents
        if not document_ids:
            return []
        
        documents = db.query(Document).filter(Document.id.in_(document_ids)).all()
        
        # Preserve order from content_collections
        doc_map = {doc.id: doc for doc in documents}
        ordered_docs = [doc_map[doc_id] for doc_id in document_ids if doc_id in doc_map]
        
        return ordered_docs
    
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
