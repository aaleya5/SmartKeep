"""
Collection Service for managing content collections.

This service provides business logic for:
- Creating, updating, deleting collections
- Adding/removing content from collections
- Listing collections with content counts
- Reordering collections
"""

import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func
from app.models.collection import Collection, ContentCollection
from app.models.content import Content
from uuid import UUID

logger = logging.getLogger(__name__)


class CollectionService:
    """Service for managing content collections."""
    
    @staticmethod
    def create_collection(
        db: Session,
        name: str,
        description: Optional[str] = None,
        color: str = "#1A3A5C",
        icon: str = "📁",
        is_pinned: bool = False
    ) -> Collection:
        """Create a new collection."""
        # Get max sort_order
        max_order = db.query(func.max(Collection.sort_order)).scalar()
        next_order = (max_order + 1) if max_order is not None else 0
        
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
    def get_collection(db: Session, collection_id: UUID) -> Optional[Collection]:
        """Get a collection by ID."""
        return db.query(Collection).filter(Collection.id == collection_id).first()
    
    @staticmethod
    def get_collection_content_count(db: Session, collection_id: UUID) -> int:
        """Get the content count for a collection."""
        count = db.query(func.count(ContentCollection.content_id)).filter(
            ContentCollection.collection_id == collection_id
        ).scalar()
        return count or 0
    
    @staticmethod
    def get_collection_preview_images(db: Session, collection_id: UUID, limit: int = 3) -> List[str]:
        """Get preview images (og_image_url) for a collection."""
        content_ids = db.query(ContentCollection.content_id).filter(
            ContentCollection.collection_id == collection_id
        ).order_by(ContentCollection.added_at.desc()).limit(limit).all()
        
        if not content_ids:
            return []
        
        content = db.query(Content).filter(
            Content.id.in_([c.content_id for c in content_ids])
        ).all()
        
        return [c.og_image_url for c in content if c.og_image_url][:limit]
    
    @staticmethod
    def list_collections(
        db: Session,
        include_empty: bool = True,
        sort: str = "newest"
    ) -> List[Dict[str, Any]]:
        """List all collections with content counts and preview images."""
        
        # Determine sort order
        if sort == "name":
            order_by = Collection.name.asc()
        elif sort == "newest":
            order_by = Collection.created_at.desc()
        elif sort == "item_count":
            # Will handle in Python after query
            order_by = Collection.created_at.desc()
        elif sort == "manual":
            order_by = Collection.is_pinned.desc(), Collection.sort_order.asc()
        else:
            order_by = Collection.created_at.desc()
        
        collections = db.query(Collection).order_by(
            Collection.is_pinned.desc(), order_by
        ).all()
        
        result = []
        for collection in collections:
            item_count = CollectionService.get_collection_content_count(db, collection.id)
            
            if not include_empty and item_count == 0:
                continue
            
            preview_images = CollectionService.get_collection_preview_images(db, collection.id)
            
            result.append({
                'id': collection.id,
                'name': collection.name,
                'description': collection.description,
                'color': collection.color,
                'icon': collection.icon,
                'is_pinned': collection.is_pinned,
                'sort_order': collection.sort_order,
                'item_count': item_count,
                'preview_images': preview_images,
                'created_at': collection.created_at,
                'updated_at': collection.updated_at,
            })
        
        # Sort by item_count if requested
        if sort == "item_count":
            result.sort(key=lambda x: x['item_count'], reverse=True)
        
        return result
    
    @staticmethod
    def reorder_collections(db: Session, ordered_ids: List[UUID]) -> int:
        """Reorder collections based on provided order."""
        updated_count = 0
        for index, collection_id in enumerate(ordered_ids):
            collection = db.query(Collection).filter(Collection.id == collection_id).first()
            if collection:
                collection.sort_order = index
                updated_count += 1
        
        db.commit()
        logger.info(f"Reordered {updated_count} collections")
        return updated_count
    
    @staticmethod
    def update_collection(
        db: Session,
        collection_id: UUID,
        name: Optional[str] = None,
        description: Optional[str] = None,
        color: Optional[str] = None,
        icon: Optional[str] = None,
        is_pinned: Optional[bool] = None,
        sort_order: Optional[int] = None
    ) -> Optional[Collection]:
        """Update a collection."""
        collection = db.query(Collection).filter(Collection.id == collection_id).first()
        if not collection:
            return None
        
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
    def delete_collection(db: Session, collection_id: UUID) -> bool:
        """Delete a collection. Does NOT delete the content items."""
        collection = db.query(Collection).filter(Collection.id == collection_id).first()
        if not collection:
            return False
        
        db.delete(collection)
        db.commit()
        
        logger.info(f"Deleted collection ID: {collection_id}")
        return True
    
    @staticmethod
    def add_content_to_collection(
        db: Session,
        collection_id: UUID,
        content_id: UUID
    ) -> Optional[ContentCollection]:
        """Add content to a collection."""
        # Check if collection exists
        collection = db.query(Collection).filter(Collection.id == collection_id).first()
        if not collection:
            logger.warning(f"Collection {collection_id} not found")
            return None
        
        # Check if content exists
        content = db.query(Content).filter(Content.id == content_id).first()
        if not content:
            logger.warning(f"Content {content_id} not found")
            return None
        
        # Check if already in collection
        existing = db.query(ContentCollection).filter(
            ContentCollection.collection_id == collection_id,
            ContentCollection.content_id == content_id
        ).first()
        
        if existing:
            logger.info(f"Content {content_id} already in collection {collection_id}")
            return existing
        
        # Create the relationship
        content_collection = ContentCollection(
            collection_id=collection_id,
            content_id=content_id
        )
        db.add(content_collection)
        
        try:
            db.commit()
            db.refresh(content_collection)
            logger.info(f"Added content {content_id} to collection {collection_id}")
            return content_collection
        except IntegrityError:
            db.rollback()
            logger.warning(f"Content {content_id} already in collection {collection_id}")
            return None
    
    @staticmethod
    def add_content_to_collection_bulk(
        db: Session,
        collection_id: UUID,
        content_ids: List[UUID]
    ) -> Dict[str, int]:
        """Add multiple content items to a collection."""
        # Check if collection exists
        collection = db.query(Collection).filter(Collection.id == collection_id).first()
        if not collection:
            logger.warning(f"Collection {collection_id} not found")
            return {"added_count": 0, "already_present": 0}
        
        added_count = 0
        already_present = 0
        
        for content_id in content_ids:
            # Check if content exists
            content = db.query(Content).filter(Content.id == content_id).first()
            if not content:
                continue
            
            # Check if already in collection
            existing = db.query(ContentCollection).filter(
                ContentCollection.collection_id == collection_id,
                ContentCollection.content_id == content_id
            ).first()
            
            if existing:
                already_present += 1
                continue
            
            # Create the relationship
            content_collection = ContentCollection(
                collection_id=collection_id,
                content_id=content_id
            )
            db.add(content_collection)
            added_count += 1
        
        try:
            db.commit()
            logger.info(f"Added {added_count} content items to collection {collection_id}")
        except IntegrityError:
            db.rollback()
            logger.warning(f"Some content already in collection {collection_id}")
        
        return {"added_count": added_count, "already_present": already_present}
    
    @staticmethod
    def remove_content_from_collection(
        db: Session,
        collection_id: UUID,
        content_id: UUID
    ) -> bool:
        """Remove content from a collection."""
        content_collection = db.query(ContentCollection).filter(
            ContentCollection.collection_id == collection_id,
            ContentCollection.content_id == content_id
        ).first()
        
        if not content_collection:
            return False
        
        db.delete(content_collection)
        db.commit()
        
        logger.info(f"Removed content {content_id} from collection {collection_id}")
        return True
    
    @staticmethod
    def get_content_in_collection(
        db: Session,
        collection_id: UUID,
        limit: int = 100,
        offset: int = 0,
        sort: str = "newest"
    ) -> List[Content]:
        """Get all content in a collection with pagination."""
        collection = db.query(Collection).filter(Collection.id == collection_id).first()
        if not collection:
            return []
        
        # Get content IDs from join table
        query = db.query(ContentCollection).filter(
            ContentCollection.collection_id == collection_id
        )
        
        if sort == "newest":
            query = query.order_by(ContentCollection.added_at.desc())
        else:
            query = query.order_by(ContentCollection.added_at.asc())
        
        content_collections = query.offset(offset).limit(limit).all()
        
        if not content_collections:
            return []
        
        content_ids = [cc.content_id for cc in content_collections]
        content = db.query(Content).filter(Content.id.in_(content_ids)).all()
        
        # Preserve order
        content_map = {c.id: c for c in content}
        ordered_content = [content_map[cid] for cid in content_ids if cid in content_map]
        
        return ordered_content
    
    @staticmethod
    def get_collections_for_content(
        db: Session,
        content_id: UUID
    ) -> List[Collection]:
        """Get all collections that contain specific content."""
        content_collections = db.query(ContentCollection).filter(
            ContentCollection.content_id == content_id
        ).all()
        
        collection_ids = [cc.collection_id for cc in content_collections]
        
        if not collection_ids:
            return []
        
        collections = db.query(Collection).filter(Collection.id.in_(collection_ids)).all()
        return collections


# Singleton instance
collection_service = CollectionService()
