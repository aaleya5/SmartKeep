"""
Tag Service for managing tags and tag analytics.
"""

import logging
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class TagService:
    """Service for tag analytics and suggestions."""
    
    @staticmethod
    def get_tag_stats(
        db: Session,
        sort: str = "count_desc",
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get tag statistics from materialized view.
        
        Args:
            db: Database session
            sort: Sort order - count_desc, count_asc, alpha
            limit: Maximum number of tags to return
            
        Returns:
            List of tag statistics
        """
        # Determine sort order
        if sort == "count_desc":
            order_by = "item_count DESC"
        elif sort == "count_asc":
            order_by = "item_count ASC"
        elif sort == "alpha":
            order_by = "tag ASC"
        else:
            order_by = "item_count DESC"
        
        sql = f"""
            SELECT tag, item_count, last_used_at
            FROM tag_stats
            ORDER BY {order_by}
            LIMIT :limit
        """
        
        result = db.execute(text(sql), {"limit": limit})
        rows = result.fetchall()
        
        return [
            {
                "tag": row.tag,
                "item_count": row.item_count,
                "last_used_at": row.last_used_at,
            }
            for row in rows
        ]
    
    @staticmethod
    def get_trending_tags(
        db: Session,
        days: int = 30,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get trending tags based on recent activity.
        
        Args:
            db: Database session
            days: Number of days to look back
            limit: Maximum number of tags to return
            
        Returns:
            List of trending tags with recent and total counts
        """
        # Calculate the date threshold
        threshold_date = datetime.utcnow() - timedelta(days=days)
        
        sql = """
            SELECT
                tag,
                COUNT(*) as recent_count,
                (SELECT COUNT(*) FROM content c, unnest(c.tags) t WHERE t = tag.tag) as total_count
            FROM content c, unnest(c.tags) AS tag
            WHERE c.created_at >= :threshold_date
            GROUP BY tag
            ORDER BY recent_count DESC
            LIMIT :limit
        """
        
        result = db.execute(text(sql), {"threshold_date": threshold_date, "limit": limit})
        rows = result.fetchall()
        
        return [
            {
                "tag": row.tag,
                "recent_count": row.recent_count,
                "total_count": row.total_count,
            }
            for row in rows
        ]
    
    @staticmethod
    def get_tag_suggestions(
        db: Session,
        prefix: str,
        limit: int = 5
    ) -> List[str]:
        """
        Get tag suggestions based on prefix.
        
        Args:
            db: Database session
            prefix: Partial tag string
            limit: Maximum number of suggestions
            
        Returns:
            List of tag suggestions
        """
        if len(prefix) < 2:
            return []
        
        sql = """
            SELECT DISTINCT tag
            FROM tag_stats
            WHERE tag ILIKE :prefix
            ORDER BY item_count DESC
            LIMIT :limit
        """
        
        result = db.execute(text(sql), {"prefix": f"%{prefix}%", "limit": limit})
        return [row.tag for row in result.fetchall()]
    
    @staticmethod
    def refresh_tag_stats(db: Session) -> bool:
        """
        Refresh the tag_stats materialized view.
        
        Args:
            db: Database session
            
        Returns:
            True if successful
        """
        try:
            db.execute(text("REFRESH MATERIALIZED VIEW CONCURRENTLY tag_stats"))
            db.commit()
            logger.info("Tag stats refreshed")
            return True
        except Exception as e:
            logger.error(f"Error refreshing tag stats: {e}")
            # Try without CONCURRENTLY if that fails
            try:
                db.execute(text("REFRESH MATERIALIZED VIEW tag_stats"))
                db.commit()
                logger.info("Tag stats refreshed (non-concurrent)")
                return True
            except Exception as e2:
                logger.error(f"Error refreshing tag stats: {e2}")
                return False


# Singleton instance
tag_service = TagService()
