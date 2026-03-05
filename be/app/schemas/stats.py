"""
Pydantic schemas for Statistics / Insights API.
"""

from pydantic import BaseModel
from typing import List, Optional, Union
from datetime import datetime
from enum import Enum


class GranularityEnum(str, Enum):
    day = "day"
    week = "week"
    month = "month"


class TimeSeriesPoint(BaseModel):
    """Data point for time series."""
    date: str
    value: float


class TimeSeriesResponse(BaseModel):
    """Response for time series data."""
    data: List[TimeSeriesPoint]
    rolling_avg: Optional[List[TimeSeriesPoint]] = None


class BarChartItem(BaseModel):
    """Item for bar chart."""
    label: str
    value: float


class BarChartResponse(BaseModel):
    """Response for bar chart data."""
    data: List[BarChartItem]


class HeatmapCell(BaseModel):
    """Cell for activity heatmap."""
    date: str
    count: int
    weekday: int  # 0=Mon ... 6=Sun


class HeatmapResponse(BaseModel):
    """Response for heatmap data."""
    cells: List[HeatmapCell]


class WeekdayActivity(BaseModel):
    """Weekday activity data."""
    weekday: str
    avg_saves: float


class WeekdayActivityResponse(BaseModel):
    """Response for weekday activity."""
    data: List[WeekdayActivity]


class ReadingTimeBucket(BaseModel):
    """Reading time bucket."""
    bucket: str
    count: int


class ReadingTimeDistributionResponse(BaseModel):
    """Response for reading time distribution."""
    data: List[ReadingTimeBucket]


class DifficultyMonth(BaseModel):
    """Difficulty data per month."""
    month: str
    easy: int
    intermediate: int
    advanced: int


class DifficultyOverTimeResponse(BaseModel):
    """Response for difficulty over time."""
    data: List[DifficultyMonth]


class StreakResponse(BaseModel):
    """Response for streak data."""
    current_streak: int
    longest_streak: int
    streak_start_date: str


class StatsOverviewResponse(BaseModel):
    """Response for overall statistics."""
    total_items: int
    total_reading_hours: float
    total_annotations: int
    longest_streak_days: int
    current_streak_days: int
    most_saved_domain: str
    average_reading_time_minutes: float
