from fastapi import APIRouter
from app.api import content, documents

api_router = APIRouter()
api_router.include_router(content.router)
api_router.include_router(documents.router)
