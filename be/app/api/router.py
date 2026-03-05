from fastapi import APIRouter
from app.api import content, documents
from app.api import search
from app.api import evaluation
from app.api import collections
from app.api import annotations
from app.api import tags
from app.api import dashboard


api_router = APIRouter()
api_router.include_router(search.router)
api_router.include_router(content.router)
api_router.include_router(documents.router)
api_router.include_router(evaluation.router)
api_router.include_router(collections.router)
api_router.include_router(annotations.router)
api_router.include_router(tags.router)
api_router.include_router(dashboard.router)
