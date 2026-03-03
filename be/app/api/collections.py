"""
Collections API endpoints.

Provides REST endpoints for:
- Creating, listing, updating, deleting collections
- Adding/removing documents from collections
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.schemas.collection import (
    CollectionCreate,
    CollectionUpdate,
    CollectionResponse,
    CollectionWithDocuments,
    AddToCollectionRequest,
    CollectionListResponse
)
from app.services.collection_service import collection_service
from app.models.document import Document


router = APIRouter(prefix="/collections", tags=["Collections"])


@router.post("", response_model=CollectionResponse, status_code=status.HTTP_201_CREATED)
def create_collection(request: CollectionCreate, db: Session = Depends(get_db)):
    """
    Create a new collection.
    
    - **name**: Required name for the collection
    - **description**: Optional description
    - **color**: Hex color code (default: #6366f1)
    """
    collection = collection_service.create_collection(
        db=db,
        name=request.name,
        description=request.description,
        color=request.color
    )
    
    return CollectionResponse(
        id=collection.id,
        name=collection.name,
        description=collection.description,
        color=collection.color,
        created_at=collection.created_at,
        document_count=getattr(collection, '_document_count', 0)
    )


@router.get("", response_model=CollectionListResponse)
def list_collections(db: Session = Depends(get_db)):
    """
    List all collections with document counts.
    """
    collections = collection_service.list_collections(db)
    
    collection_responses = [
        CollectionResponse(
            id=c.id,
            name=c.name,
            description=c.description,
            color=c.color,
            created_at=c.created_at,
            document_count=getattr(c, '_document_count', 0)
        )
        for c in collections
    ]
    
    return CollectionListResponse(
        collections=collection_responses,
        total=len(collection_responses)
    )


@router.get("/{collection_id}", response_model=CollectionWithDocuments)
def get_collection(collection_id: int, db: Session = Depends(get_db)):
    """
    Get a single collection with all its documents.
    """
    collection = collection_service.get_collection(db, collection_id)
    if not collection:
        raise HTTPException(
            status_code=404,
            detail=f"Collection {collection_id} not found"
        )
    
    documents = collection_service.get_documents_in_collection(db, collection_id)
    
    return CollectionWithDocuments(
        id=collection.id,
        name=collection.name,
        description=collection.description,
        color=collection.color,
        created_at=collection.created_at,
        document_count=len(documents),
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
        name=collection.name,
        description=collection.description,
        color=collection.color,
        created_at=collection.created_at,
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


@router.post("/{collection_id}/content/{document_id}", status_code=status.HTTP_200_OK)
def add_document_to_collection(
    collection_id: int,
    document_id: int,
    db: Session = Depends(get_db)
):
    """
    Add a document to a collection.
    
    Returns the updated collection with new item count.
    """
    # Verify document exists
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=404,
            detail=f"Document {document_id} not found"
        )
    
    # Add to collection
    result = collection_service.add_document_to_collection(
        db=db,
        collection_id=collection_id,
        document_id=document_id
    )
    
    if result is None:
        # Check if it's because collection doesn't exist
        collection = collection_service.get_collection(db, collection_id)
        if not collection:
            raise HTTPException(
                status_code=404,
                detail=f"Collection {collection_id} not found"
            )
        # Already in collection is OK, just return success
        pass
    
    # Get updated collection
    collection = collection_service.get_collection(db, collection_id)
    
    return {
        "message": "Document added to collection",
        "collection_id": collection_id,
        "document_id": document_id,
        "collection_item_count": collection_service.get_collection_document_count(db, collection_id)
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
            name=c.name,
            description=c.description,
            color=c.color,
            created_at=c.created_at,
            document_count=getattr(c, '_document_count', 0)
        )
        for c in collections
    ]
