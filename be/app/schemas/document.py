from pydantic import BaseModel, field_serializer, ConfigDict
from datetime import datetime
from typing import Optional, List


class DocumentCreate(BaseModel):
    title: str
    content: str
    source_url: str | None = None
    domain: str | None = None
    tags: str | None = None


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    title: str
    content: str
    source_url: str | None
    domain: str | None
    tags: str | None
    is_truncated: bool = False
    created_at: datetime | None
    
    # AI/Enrichment fields
    enrichment_status: str = "pending"
    summary: Optional[str] = None
    suggested_tags: Optional[str] = None
    reading_time: Optional[float] = None
    difficulty_score: Optional[float] = None
    
    @field_serializer('created_at')
    @staticmethod
    def serialize_datetime(value: datetime | None) -> str | None:
        if value is None:
            return None
        if isinstance(value, str):
            return value
        return value.isoformat()
    
    @field_serializer('suggested_tags')
    @staticmethod
    def serialize_suggested_tags(value: str | None) -> List[str] | None:
        """Deserialize JSON string to list."""
        if value is None:
            return None
        import json
        try:
            return json.loads(value)
        except:
            return None
    
    def get_difficulty_level(self) -> str:
        """Get difficulty level based on Flesch-Kincaid score."""
        if self.difficulty_score is None:
            return "Unknown"
        
        if self.difficulty_score >= 60:
            return "Easy"
        elif self.difficulty_score >= 30:
            return "Intermediate"
        else:
            return "Advanced"
    
    def get_reading_time_display(self) -> str:
        """Get human-readable reading time."""
        if self.reading_time is None:
            return ""
        
        if self.reading_time < 1:
            return "< 1 min read"
        elif self.reading_time == 1:
            return "1 min read"
        else:
            return f"~{int(self.reading_time)} min read"
