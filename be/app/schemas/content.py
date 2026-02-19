from pydantic import BaseModel, HttpUrl

class URLRequest(BaseModel):
    url: HttpUrl

class ManualContentRequest(BaseModel):
    title: str
    content: str
