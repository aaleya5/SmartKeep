"""
Collections API endpoints.

Provides REST endpoints for:
- Creating, listing, updating, deleting collections
- Adding/removing documents from collections
- Reordering collections
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.schemas.collection import (
    CollectionCreate,
    CollectionUpdate,
    CollectionResponse,
    CollectionWithDocuments,
    AddToCollectionRequest,
    CollectionListResponse,
    CollectionReorderRequest
)
from app.services.collection_service import collection_service
from app.models.document import Document


router = APIRouter(prefix="/collections", tags=["Collections"])


@router.post("", response_model=CollectionResponse, status_code=status.HTTP_201_CREATED)
def create_collection(request: CollectionCreate, db: Session = Depends(get_db)):
    """
    Create a new collection **name**: Required.
    
    - name for the collection
    - **description**: Optional description
    - **color**: Hex color code (default: #6366f1)
    - **icon**: Emoji or icon (default: 📁)
    - **is_pinned**: Whether to pin the collection (default: false)
    """
    collection = collection_service.create_collection(
        db=db,
        name=request.name,
        description=request.description,
        color=request.color,
        icon=request.icon,
        is_pinned=request.is_pinned
    )
    
    return CollectionResponse(
        id=collection.id,
        uuid=collection.uuid,
        name=collection.name,
        description=collection.description,
        color=collection.color,
        icon=collection.icon,
        is_pinned=collection.is_pinned,
        sort_order=collection.sort_order,
        created_at=collection.created_at,
        updated_at=collection.updated_at,
        document_count=getattr(collection, '_document_count', 0)
    )


@router.get("", response_model=CollectionListResponse)
def list_collections(
    include_empty: bool = Query(True, description="Include collections with no documents"),
    sort: str = Query("newest", description="Sort order: name, newest, item_count, manual"),
    db: Session = Depends(get_db)
):
    """
    List all collections with document counts.
    
    - **include_empty**: Whether to include collections with no documents (default: true)
    - **sort**: Sort order - 'name', 'newest', 'item_count', 'manual' (default: newest)
    """
    collections = collection_service.list_collections(
        db, 
        include_empty=include_empty,
        sort=sort
    )
    
    collection_responses = [
        CollectionResponse(
            id=c.id,
            uuid=c.uuid,
            name=c.name,
            description=c.description,
            color=c.color,
            icon=c.icon,
            is_pinned=c.is_pinned,
            sort_order=c.sort_order,
            created_at=c.created_at,
            updated_at=c.updated_at,
            document_count=getattr(c, '_document_count', 0)
        )
        for c in collections
    ]
    
    return CollectionListResponse(
        collections=collection_responses,
        total=len(collection_responses)
    )


@router.get("/{collection_id}", response_model=CollectionWithDocuments)
def get_collection(
    collection_id: int,
    limit: int = Query(100, ge=1, le=100, description="Max documents to return"),
    offset: int = Query(0, ge=0, description="Number of documents to skip"),
    db: Session = Depends(get_db)
):
    """
    Get a single collection with all its documents.
    """
    collection = collection_service.get_collection(db, collection_id)
    if not collection:
        raise HTTPException(
            status_code=404,
            detail=f"Collection {collection_id} not found"
        )
    
    documents = collection_service.get_documents_in_collection(
        db, 
        collection_id,
        limit=limit,
        offset=offset
    )
    
    return CollectionWithDocuments(
        id=collection.id,
        uuid=collection.uuid,
        name=collection.name,
        description=collection.description,
        color=collection.color,
        icon=collection.icon,
        is_pinned=collection.is_pinned,
        sort_order=collection.sort_order,
        created_at=collection.created_at,
        updated_at=collection.updated_at,
        document_count=len(documents),
        preview_images=[],  # TODO: Add og_image_url to documents
        documents=[
            {
                "id": doc.id,
                "title": doc.title,
                "content": doc.content[:100] + "..." if len(doc.content) > 100 else doc.content,
                "domain": doc.domain,
                "added_at": None
            }
            for doc in documents
        ]
    )


@router.put("/{collection_id}", response_model=CollectionResponse)
def update_collection(
    collection_id: int,
    request: CollectionUpdate,
    db: Session = Depends(get_db)
):
    """
    Update a collection's details.
    """
    # Get only explicitly set fields (exclude_unset=True handles partial updates properly)
    update_data = request.model_dump(exclude_unset=True)
    
    collection = collection_service.update_collection(
        db=db,
        collection_id=collection_id,
        **update_data
    )
    
    if not collection:
        raise HTTPException(
            status_code=404,
            detail=f"Collection {collection_id} not found"
        )
    
    return CollectionResponse(
        id=collection.id,
        uuid=collection.uuid,
        name=collection.name,
        description=collection.description,
        color=collection.color,
        icon=collection.icon,
        is_pinned=collection.is_pinned,
        sort_order=collection.sort_order,
        created_at=collection.created_at,
        updated_at=collection.updated_at,
        document_count=getattr(collection, '_document_count', 0)
    )


@router.delete("/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_collection(collection_id: int, db: Session = Depends(get_db)):
    """
    Delete a collection.
    """
    success = collection_service.delete_collection(db, collection_id)
    
    if not success:
        raise HTTPException(
            status_code=404,
            detail=f"Collection {collection_id} not found"
        )
    
    return None


@router.post("/{collection_id}/content", status_code=status.HTTP_200_OK)
def add_documents_to_collection(
    collection_id: int,
    request: AddToCollectionRequest,
    db: Session = Depends(get_db)
):
    """
    Add documents to a collection.
    
    Body: { "content_ids": [1, 2, 3] }
    Returns the counts of added and already present documents.
    """
    result = collection_service.add_documents_to_collection(
        db=db,
        collection_id=collection_id,
        document_ids=request.content_ids
    )
    
    # Check if collection exists
    collection = collection_service.get_collection(db, collection_id)
    if not collection:
        raise HTTPException(
            status_code=404,
            detail=f"Collection {collection_id} not found"
        )
    
    return {
        "message": "Documents added to collection",
        "collection_id": collection_id,
        "added_count": result["added_count"],
        "already_present": result["already_present"]
    }


@router.delete("/{collection_id}/content/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_document_from_collection(
    collection_id: int,
    document_id: int,
    db: Session = Depends(get_db)
):
    """
    Remove a document from a collection.
    """
    success = collection_service.remove_document_from_collection(
        db=db,
        collection_id=collection_id,
        document_id=document_id
    )
    
    if not success:
        raise HTTPException(
            status_code=404,
            detail=f"Document {document_id} not found in collection {collection_id}"
        )
    
    return None


@router.put("/reorder", status_code=status.HTTP_200_OK)
def reorder_collections(
    request: CollectionReorderRequest,
    db: Session = Depends(get_db)
):
    """
    Reorder collections.
    
    Body: { "ordered_ids": [1, 3, 2, 4] }
    """
    success = collection_service.reorder_collections(
        db=db,
        ordered_ids=request.ordered_ids
    )
    
    return {
        "message": "Collections reordered",
        "updated_count": len(request.ordered_ids)
    }


@router.get("/document/{document_id}", response_model=List[CollectionResponse])
def get_collections_for_document(document_id: int, db: Session = Depends(get_db)):
    """
    Get all collections that contain a specific document.
    """
    # Verify document exists
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=404,
            detail=f"Document {document_id} not found"
        )
    
    collections = collection_service.get_collections_for_document(db, document_id)
    
    return [
        CollectionResponse(
            id=c.id,
            uuid=c.uuid,
            name=c.name,
            description=c.description,
            color=c.color,
            icon=c.icon,
            is_pinned=c.is_pinned,
            sort_order=c.sort_order,
            created_at=c.created_at,
            updated_at=c.updated_at,
            document_count=getattr(c, '_document_count', 0)
        )
        for c in collections
    ]
