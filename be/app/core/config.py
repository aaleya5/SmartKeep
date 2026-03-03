from pydantic import BaseSettings, SecretStr
from typing import Optional


class Settings(BaseSettings):
    DATABASE_URL: str
    
    # Groq API Configuration (for LLM summarization and tagging)
    GROQ_API_KEY: SecretStr = None  # type: ignore
    
    # Content Processing Configuration
    MAX_CONTENT_LENGTH: int = 10000
    
    # Hybrid Search Configuration
    # Weight for BM25 in hybrid search (semantic weight = 1 - bm25_weight)
    HYBRID_SEARCH_BM25_WEIGHT: float = 0.4
    HYBRID_SEARCH_SEMANTIC_WEIGHT: float = 0.6
    
    # Embedding Model Configuration
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    EMBEDDING_DIMENSION: int = 384
    
    # LLM Configuration
    LLM_MODEL: str = "llama3-8b-8192"
    LLM_MAX_TOKENS: int = 500
    LLM_TEMPERATURE: float = 0.3

    class Config:
        env_file = ".env"


settings = Settings()
