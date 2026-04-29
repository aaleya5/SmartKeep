from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool
from app.core.config import settings

# Import all models here so that they are registered with SQLAlchemy's metadata
# before any session or router accesses them, preventing mapper initialization errors.
from app.models.user import User
from app.models.content import Content, VectorType
from app.models.collection import Collection, ContentCollection
from app.models.annotation import Annotation
from app.models.search import SearchHistory, SavedSearch
from app.models.preferences import Preferences

engine = create_engine(
    settings.DATABASE_URL,
    poolclass=QueuePool,
    pool_size=10,  # Maximum number of connections in the pool
    max_overflow=20,  # Additional connections when pool is full
    pool_pre_ping=True,  # Verify connections before use
    pool_recycle=3600,  # Recycle connections after 1 hour
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
