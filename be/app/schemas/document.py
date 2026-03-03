from pydantic import BaseModel, field_serializer, ConfigDict
from datetime import datetime

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
    
    @field_serializer('created_at')
    @staticmethod
    def serialize_datetime(value: datetime | None) -> str | None:
        if value is None:
            return None
        if isinstance(value, str):
            return value
        return value.isoformat()
