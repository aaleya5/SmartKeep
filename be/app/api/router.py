from fastapi import APIRouter
from app.api import content, documents
from app.api import search
from app.api import evaluation


api_router = APIRouter()
api_router.include_router(search.router)
api_router.include_router(content.router)
api_router.include_router(documents.router)
api_router.include_router(evaluation.router)
