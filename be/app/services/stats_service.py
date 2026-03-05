"""
Statistics Service for insights and analytics.

Computes various statistics from existing data.
"""

import logging
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from app.models.content import Content
from app.models.annotation import Annotation
from datetime import datetime, timedelta, date
import calendar

logger = logging.getLogger(__name__)


class StatsService:
    """Service for computing statistics."""
    
    @staticmethod
    def get_overview(db: Session) -> Dict[str, Any]:
        """Get overall statistics."""
        # Total items
        total_items = db.query(func.count(Content.id)).scalar() or 0
        
        # Total reading hours
        total_words = db.query(func.sum(Content.word_count)).scalar() or 0
        total_reading_hours = (total_words / 200) / 60
        
        # Total annotations
        total_annotations = db.query(func.count(Annotation.id)).scalar() or 0
        
        # Average reading time
        avg_words = db.query(func.avg(Content.word_count)).scalar() or 0
        average_reading_time_minutes = (avg_words / 200) if avg_words else 0
        
        # Most saved domain
        domain_result = db.query(
            Content.domain,
            func.count(Content.id).label('count')
        ).group_by(Content.domain).order_by(func.count(Content.id).desc()).first()
        most_saved_domain = domain_result[0] if domain_result else ""
        
        # Calculate streaks
        current_streak, longest_streak = StatsService._calculate_streaks(db)
        
        return {
            'total_items': total_items,
            'total_reading_hours': round(total_reading_hours, 1),
            'total_annotations': total_annotations,
            'longest_streak_days': longest_streak,
            'current_streak_days': current_streak,
            'most_saved_domain': most_saved_domain,
            'average_reading_time_minutes': round(average_reading_time_minutes, 1),
        }
    
    @staticmethod
    def _calculate_streaks(db: Session) -> tuple[int, int]:
        """Calculate current and longest streaks of saving content."""
        # Get all dates with saves
        result = db.query(
            func.date(Content.created_at).label('date')
        ).distinct().order_by(func.date(Content.created_at).desc()).all()
        
        if not result:
            return 0, 0
        
        save_dates = sorted(set([r.date for r in result]))
        
        current_streak = 0
        longest_streak = 0
        temp_streak = 0
        streak_start = None
        
        today = date.today()
        
        for i, d in enumerate(save_dates):
            if i == 0:
                if d >= today - timedelta(days=1):
                    temp_streak = 1
                    streak_start = d
                else:
                    temp_streak = 1
            else:
                prev = save_dates[i - 1]
                if d == prev - timedelta(days=1):
                    temp_streak += 1
                else:
                    if temp_streak > longest_streak:
                        longest_streak = temp_streak
                    temp_streak = 1
                    streak_start = d
        
        if temp_streak > longest_streak:
            longest_streak = temp_streak
        
        # Check if current streak is active (today or yesterday)
        if save_dates:
            latest = save_dates[0]
            if latest >= today - timedelta(days=1):
                # Count backwards from latest
                current_streak = 1
                for i in range(1, len(save_dates)):
                    if save_dates[i] == save_dates[i-1] - timedelta(days=1):
                        current_streak += 1
                    else:
                        break
        
        return current_streak, longest_streak
    
    @staticmethod
    def get_saves_over_time(
        db: Session,
        days: int = 90,
        granularity: str = "day"
    ) -> Dict[str, Any]:
        """Get saves over time with optional rolling average."""
        threshold = datetime.utcnow() - timedelta(days=days)
        
        if granularity == "day":
            # Group by day
            result = db.query(
                func.date(Content.created_at).label('date'),
                func.count(Content.id).label('value')
            ).filter(
                Content.created_at >= threshold
            ).group_by(func.date(Content.created_at)).all()
            
            data = [{"date": str(r.date), "value": r.value} for r in result]
            
        elif granularity == "week":
            # Group by week
            result = db.query(
                func.date_trunc('week', Content.created_at).label('date'),
                func.count(Content.id).label('value')
            ).filter(
                Content.created_at >= threshold
            ).group_by(func.date_trunc('week', Content.created_at)).all()
            
            data = [{"date": str(r.date)[:10], "value": r.value} for r in result]
            
        else:  # month
            result = db.query(
                func.date_trunc('month', Content.created_at).label('date'),
                func.count(Content.id).label('value')
            ).filter(
                Content.created_at >= threshold
            ).group_by(func.date_trunc('month', Content.created_at)).all()
            
            data = [{"date": str(r.date)[:7], "value": r.value} for r in result]
        
        # Calculate 7-day rolling average
        if len(data) >= 7:
            rolling_avg = []
            for i in range(len(data)):
                start = max(0, i - 6)
                end = i + 1
                window = data[start:end]
                avg = sum(d['value'] for d in window) / len(window)
                rolling_avg.append({"date": data[i]['date'], "value": round(avg, 2)})
        else:
            rolling_avg = None
        
        return {'data': data, 'rolling_avg': rolling_avg}
    
    @staticmethod
    def get_top_domains(db: Session, limit: int = 10) -> List[Dict[str, Any]]:
        """Get top domains by content count."""
        result = db.query(
            Content.domain,
            func.count(Content.id).label('value')
        ).group_by(Content.domain).order_by(
            func.count(Content.id).desc()
        ).limit(limit).all()
        
        return [{"label": r.domain, "value": r.value} for r in result]
    
    @staticmethod
    def get_tag_distribution(db: Session, limit: int = 15) -> List[Dict[str, Any]]:
        """Get tag distribution."""
        result = db.query(
            func.unnest(Content.tags).label('tag'),
            func.count(Content.id).label('value')
        ).filter(
            Content.tags.isnot(None),
            func.array_length(Content.tags, 1) > 0
        ).group_by(func.unnest(Content.tags)).order_by(
            func.count(Content.id).desc()
        ).limit(limit).all()
        
        return [{"label": r.tag, "value": r.value} for r in result]
    
    @staticmethod
    def get_reading_time_distribution(db: Session) -> List[Dict[str, Any]]:
        """Get reading time distribution in buckets."""
        # Define buckets: <3 min, 3-10 min, 10-20 min, >20 min
        buckets = [
            ("<3 min", 0, 3 * 200),
            ("3-10 min", 3 * 200, 10 * 200),
            ("10-20 min", 10 * 200, 20 * 200),
            (">20 min", 20 * 200, None),
        ]
        
        result = []
        for bucket_label, min_words, max_words in buckets:
            if max_words:
                count = db.query(func.count(Content.id)).filter(
                    Content.word_count > min_words,
                    Content.word_count <= max_words
                ).scalar() or 0
            else:
                count = db.query(func.count(Content.id)).filter(
                    Content.word_count > min_words
                ).scalar() or 0
            
            result.append({"bucket": bucket_label, "count": count})
        
        return result
    
    @staticmethod
    def get_difficulty_over_time(db: Session) -> List[Dict[str, Any]]:
        """Get difficulty distribution over time (monthly)."""
        result = db.query(
            func.date_trunc('month', Content.created_at).label('month'),
            Content.difficulty,
            func.count(Content.id).label('count')
        ).filter(
            Content.difficulty.isnot(None),
            Content.created_at.isnot(None)
        ).group_by(
            func.date_trunc('month', Content.created_at),
            Content.difficulty
        ).order_by(func.date_trunc('month', Content.created_at).desc()).all()
        
        # Organize by month
        monthly_data: Dict[str, Dict[str, int]] = {}
        for r in result:
            month_str = str(r.month)[:7]
            if month_str not in monthly_data:
                monthly_data[month_str] = {'easy': 0, 'intermediate': 0, 'advanced': 0}
            if r.difficulty in monthly_data[month_str]:
                monthly_data[month_str][r.difficulty] = r.count
        
        # Convert to list
        return [
            {
                'month': month,
                'easy': data.get('easy', 0),
                'intermediate': data.get('intermediate', 0),
                'advanced': data.get('advanced', 0),
            }
            for month, data in sorted(monthly_data.items(), reverse=True)[:12]
        ]
    
    @staticmethod
    def get_activity_heatmap(db: Session, days: int = 365) -> List[Dict[str, Any]]:
        """Get activity heatmap data."""
        threshold = datetime.utcnow() - timedelta(days=days)
        
        result = db.query(
            func.date(Content.created_at).label('date'),
            func.count(Content.id).label('count')
        ).filter(
            Content.created_at >= threshold
        ).group_by(func.date(Content.created_at)).all()
        
        # Create a map of date -> count
        date_counts = {r.date: r.count for r in result}
        
        # Generate all days in the range
        cells = []
        start_date = (datetime.utcnow() - timedelta(days=days)).date()
        end_date = datetime.utcnow().date()
        
        current = start_date
        while current <= end_date:
            weekday = current.weekday()  # 0=Mon, 6=Sun
            cells.append({
                'date': str(current),
                'count': date_counts.get(current, 0),
                'weekday': weekday,
            })
            current += timedelta(days=1)
        
        return cells
    
    @staticmethod
    def get_weekday_activity(db: Session) -> List[Dict[str, Any]]:
        """Get average saves per weekday."""
        weekday_names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        
        result = db.query(
            func.extract('dow', Content.created_at).label('weekday'),
            func.count(Content.id).label('total'),
            func.count(func.distinct(func.date(Content.created_at))).label('days')
        ).group_by(func.extract('dow', Content.created_at)).all()
        
        # Calculate averages
        weekday_totals = {int(r.weekday): (r.total, r.days) for r in result}
        
        # Get total days in the dataset
        min_date = db.query(func.min(Content.created_at)).scalar()
        max_date = db.query(func.max(Content.created_at)).scalar()
        
        if min_date and max_date:
            total_days = (max_date - min_date).days + 1
        else:
            total_days = 1
        
        data = []
        for i, name in enumerate(weekday_names):
            if i in weekday_totals:
                total, days = weekday_totals[i]
                avg = total / max(days, 1)
            else:
                avg = 0
            data.append({'weekday': name, 'avg_saves': round(avg, 2)})
        
        return data


# Singleton instance
stats_service = StatsService()
