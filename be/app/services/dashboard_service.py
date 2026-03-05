"""
Dashboard Service for aggregating all dashboard data.

This service fetches all dashboard data in parallel queries for optimal performance.
"""

import logging
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from app.models.content import Content
from app.models.annotation import Annotation
from app.models.collection import Collection, ContentCollection
from app.services.tag_service import tag_service
from datetime import datetime, timedelta
import random

logger = logging.getLogger(__name__)


class DashboardService:
    """Service for dashboard data aggregation."""
    
    @staticmethod
    def get_dashboard_data(db: Session) -> Dict[str, Any]:
        """
        Get all dashboard data in optimized parallel queries.
        
        Performance target: < 200ms using efficient SQL queries.
        """
        
        # 1. Recent saves (last 9 items)
        recent_saves = db.query(Content).order_by(
            Content.created_at.desc()
        ).limit(9).all()
        
        # 2. Continue reading (last 5 opened with progress 0 < p < 1)
        continue_reading = db.query(Content).filter(
            Content.reading_progress > 0,
            Content.reading_progress < 1
        ).order_by(Content.last_opened_at.desc()).limit(5).all()
        
        # 3. Collections with previews
        collections_data = []
        collections = db.query(Collection).order_by(
            Collection.is_pinned.desc(), Collection.sort_order.asc()
        ).all()
        
        for coll in collections:
            # Get item count
            item_count = db.query(func.count(ContentCollection.content_id)).filter(
                ContentCollection.collection_id == coll.id
            ).scalar() or 0
            
            # Get preview images
            preview_content = db.query(Content).join(
                ContentCollection, Content.id == ContentCollection.content_id
            ).filter(
                ContentCollection.collection_id == coll.id
            ).order_by(ContentCollection.added_at.desc()).limit(3).all()
            
            preview_images = [c.og_image_url for c in preview_content if c.og_image_url]
            
            collections_data.append({
                'id': coll.id,
                'name': coll.name,
                'description': coll.description,
                'color': coll.color,
                'icon': coll.icon,
                'is_pinned': coll.is_pinned,
                'sort_order': coll.sort_order,
                'item_count': item_count,
                'preview_images': preview_images,
                'created_at': coll.created_at,
                'updated_at': coll.updated_at,
            })
        
        # 4. Trending tags
        trending_tags = tag_service.get_trending_tags(db, days=30, limit=5)
        
        # 5. Saves this week (last 7 days)
        week_ago = datetime.utcnow() - timedelta(days=7)
        saves_per_day = db.query(
            func.date(Content.created_at).label('day'),
            func.count(Content.id).label('count')
        ).filter(
            Content.created_at >= week_ago
        ).group_by(func.date(Content.created_at)).all()
        
        saves_this_week = [
            {"date": str(row.day), "count": row.count}
            for row in saves_per_day
        ]
        
        # Fill in missing days with zero counts
        date_counts = {s['date']: s['count'] for s in saves_this_week}
        for i in range(7):
            day = (datetime.utcnow() - timedelta(days=i)).date()
            day_str = str(day)
            if day_str not in date_counts:
                saves_this_week.append({"date": day_str, "count": 0})
        saves_this_week.sort(key=lambda x: x['date'])
        
        # 6. Suggested rereads (old items, never annotated)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        # Get content IDs that have annotations
        annotated_ids = db.query(Annotation.content_id).distinct().subquery()
        
        # Get old content without annotations
        rereads_query = db.query(Content).filter(
            Content.created_at < thirty_days_ago,
            ~Content.id.in_(annotated_ids)
        ).all()
        
        # Random selection of up to 3
        if len(rereads_query) > 3:
            suggested_rereads = random.sample(rereads_query, 3)
        else:
            suggested_rereads = rereads_query
        
        # 7. Total counts
        total_items = db.query(func.count(Content.id)).scalar() or 0
        total_annotations = db.query(func.count(Annotation.id)).scalar() or 0
        
        # Calculate total reading hours
        total_words = db.query(func.sum(Content.word_count)).scalar() or 0
        total_reading_hours = (total_words / 200) / 60  # words / 200 wpm / 60 = hours
        
        return {
            'recent_saves': recent_saves,
            'continue_reading': continue_reading,
            'collections_preview': collections_data,
            'trending_tags': trending_tags,
            'saves_this_week': saves_this_week,
            'suggested_rereads': suggested_rereads,
            'total_items': total_items,
            'total_reading_hours': round(total_reading_hours, 1),
            'total_annotations': total_annotations,
        }


# Singleton instance
dashboard_service = DashboardService()
