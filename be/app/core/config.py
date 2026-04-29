from pydantic_settings import BaseSettings
from pydantic import SecretStr
from typing import Optional


class Settings(BaseSettings):
    DATABASE_URL: str
    
    # Groq API Configuration (for LLM summarization and tagging)
    GROQ_API_KEY: SecretStr = None  # type: ignore

    # Reddit API Configuration (for scraping Reddit links via PRAW)
    REDDIT_CLIENT_ID: Optional[str] = None
    REDDIT_CLIENT_SECRET: Optional[SecretStr] = None
    
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

    # JWT Authentication Configuration
    JWT_SECRET_KEY: SecretStr = SecretStr("smartkeep-dev-secret")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    class Config:
        env_file = ".env"


settings = Settings()
