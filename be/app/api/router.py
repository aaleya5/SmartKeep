from fastapi import APIRouter
from app.api import content, documents
from app.api import search
from app.api import evaluation
from app.api import collections
from app.api import annotations
from app.api import tags
from app.api import dashboard
from app.api import explore
from app.api import stats
from app.api import preferences
from app.api import import_export


api_router = APIRouter()
api_router.include_router(search.router)
api_router.include_router(content.router)
api_router.include_router(documents.router)
api_router.include_router(evaluation.router)
api_router.include_router(collections.router)
api_router.include_router(annotations.router)
api_router.include_router(tags.router)
api_router.include_router(dashboard.router)
api_router.include_router(explore.router)
api_router.include_router(stats.router)
api_router.include_router(preferences.router)
api_router.include_router(import_export.router)
