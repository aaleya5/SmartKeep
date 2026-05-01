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
from app.models.auth_token import VerificationToken, PasswordResetToken

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

from sqlalchemy import event

@event.listens_for(engine, "checkin")
def clear_rls(dbapi_connection, connection_record):
    """Clear RLS settings when connection is returned to the pool to prevent leaks."""
    if dbapi_connection is None:
        return
    
    try:
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("RESET app.current_user_id")
            cursor.execute("RESET app.bypass_rls")
            # Also ensure we're not leaving an uncommitted transaction from the RESET
            if not dbapi_connection.autocommit:
                dbapi_connection.commit()
        finally:
            cursor.close()
    except Exception:
        # If the connection is broken, resetting RLS will fail, which is fine 
        # as the connection will be discarded anyway.
        pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
