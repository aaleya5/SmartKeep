from pydantic import BaseModel

class DocumentCreate(BaseModel):
    title: str
    raw_text: str

class DocumentResponse(DocumentCreate):
    id: int