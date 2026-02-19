from fastapi import FastAPI
from app.api.router import api_router

app = FastAPI(title="SmartKeep API")

app.include_router(api_router)

@app.get("/")
def root():
    return {"message": "SmartKeep API Running"}