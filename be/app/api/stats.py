"""
Statistics / Insights API endpoints.

Provides various statistics and analytics endpoints.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.stats import (
    StatsOverviewResponse,
    TimeSeriesResponse,
    TimeSeriesPoint,
    BarChartResponse,
    BarChartItem,
    HeatmapResponse,
    HeatmapCell,
    WeekdayActivityResponse,
    WeekdayActivity,
    ReadingTimeDistributionResponse,
    ReadingTimeBucket,
    DifficultyOverTimeResponse,
    DifficultyMonth,
    StreakResponse,
    GranularityEnum,
)
from app.services.stats_service import stats_service


router = APIRouter(prefix="/stats", tags=["Stats"])


@router.get("/overview", response_model=StatsOverviewResponse)
def get_stats_overview(db: Session = Depends(get_db)):
    """
    Get overall statistics overview.
    
    Returns total items, reading hours, annotations, streaks, most saved domain, and average reading time.
    """
    data = stats_service.get_overview(db)
    
    return StatsOverviewResponse(**data)


@router.get("/saves-over-time", response_model=TimeSeriesResponse)
def get_saves_over_time(
    days: int = Query(90, ge=1, le=365, description="Number of days"),
    granularity: GranularityEnum = Query(GranularityEnum.day, description="Granularity"),
    db: Session = Depends(get_db)
):
    """
    Get saves over time with rolling average.
    
    Returns time series data with optional 7-day rolling average.
    """
    data = stats_service.get_saves_over_time(db, days=days, granularity=granularity.value)
    
    return TimeSeriesResponse(
        data=[TimeSeriesPoint(date=d['date'], value=d['value']) for d in data['data']],
        rolling_avg=[TimeSeriesPoint(date=d['date'], value=d['value']) for d in data['rolling_avg']] if data.get('rolling_avg') else None
    )


@router.get("/top-domains", response_model=BarChartResponse)
def get_top_domains(
    limit: int = Query(10, ge=1, le=50, description="Number of domains"),
    db: Session = Depends(get_db)
):
    """
    Get top domains by content count.
    """
    data = stats_service.get_top_domains(db, limit=limit)
    
    return BarChartResponse(
        data=[BarChartItem(label=d['label'], value=d['value']) for d in data]
    )


@router.get("/tag-distribution", response_model=BarChartResponse)
def get_tag_distribution(
    limit: int = Query(15, ge=1, le=50, description="Number of tags"),
    db: Session = Depends(get_db)
):
    """
    Get tag distribution.
    """
    data = stats_service.get_tag_distribution(db, limit=limit)
    
    return BarChartResponse(
        data=[BarChartItem(label=d['label'], value=d['value']) for d in data]
    )


@router.get("/reading-time-distribution", response_model=ReadingTimeDistributionResponse)
def get_reading_time_distribution(db: Session = Depends(get_db)):
    """
    Get reading time distribution.
    
    Buckets: <3 min, 3-10 min, 10-20 min, >20 min
    """
    data = stats_service.get_reading_time_distribution(db)
    
    return ReadingTimeDistributionResponse(
        data=[ReadingTimeBucket(bucket=d['bucket'], count=d['count']) for d in data]
    )


@router.get("/difficulty-over-time", response_model=DifficultyOverTimeResponse)
def get_difficulty_over_time(db: Session = Depends(get_db)):
    """
    Get difficulty distribution over time (monthly).
    """
    data = stats_service.get_difficulty_over_time(db)
    
    return DifficultyOverTimeResponse(
        data=[DifficultyMonth(**d) for d in data]
    )


@router.get("/activity-heatmap", response_model=HeatmapResponse)
def get_activity_heatmap(
    days: int = Query(365, ge=30, le=730, description="Number of days"),
    db: Session = Depends(get_db)
):
    """
    Get activity heatmap data.
    """
    data = stats_service.get_activity_heatmap(db, days=days)
    
    return HeatmapResponse(
        cells=[HeatmapCell(**c) for c in data]
    )


@router.get("/weekday-activity", response_model=WeekdayActivityResponse)
def get_weekday_activity(db: Session = Depends(get_db)):
    """
    Get weekday activity for radar chart.
    """
    data = stats_service.get_weekday_activity(db)
    
    return WeekdayActivityResponse(
        data=[WeekdayActivity(**d) for d in data]
    )


@router.get("/streak", response_model=StreakResponse)
def get_streak(db: Session = Depends(get_db)):
    """
    Get current and longest streak.
    """
    overview = stats_service.get_overview(db)
    
    return StreakResponse(
        current_streak=overview['current_streak_days'],
        longest_streak=overview['longest_streak_days'],
        streak_start_date="",  # Could be calculated separately if needed
    )
