from pydantic import BaseModel

class DocumentCreate(BaseModel):
    title: str
    content: str
    source_url: str | None = None
    domain: str | None = None

class DocumentResponse(BaseModel):
    id: int
    title: str
    content: str
    source_url: str | None
    domain: str | None

    class Config:
        from_attributes = True
