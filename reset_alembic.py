"""Script to reset alembic version."""

import sys
sys.path.insert(0, 'be')

from app.db.session import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text('DELETE FROM alembic_version'))
    conn.commit()
    print('Cleared alembic_version table')
