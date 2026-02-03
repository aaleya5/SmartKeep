from fastapi import FastAPI
from app.api.documents import router

app = FastAPI()
app.include_router(router)
