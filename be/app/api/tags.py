from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from app.db.session import get_db
from app.api.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/tags", tags=["Tags"])

@router.get("", response_model=List[str])
async def get_all_tags(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all unique tags for the current user, including suggested tags.
    """
    # tags and suggested_tags are text[] (native Postgres arrays), use unnest()
    query = text("""
        SELECT DISTINCT tag
        FROM (
            SELECT unnest(tags) as tag
            FROM content
            WHERE user_id = :user_id AND tags IS NOT NULL
            UNION
            SELECT unnest(suggested_tags) as tag
            FROM content
            WHERE user_id = :user_id AND suggested_tags IS NOT NULL
        ) tags_combined
        WHERE tag IS NOT NULL AND tag != ''
        ORDER BY tag ASC
    """)

    result = db.execute(query, {"user_id": str(current_user.id)})
    tags = [row[0] for row in result]
    return tags
