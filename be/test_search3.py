import sys
sys.path.insert(0, '.')
from sqlalchemy import text
from app.db.session import get_db
db = next(get_db())
result = db.execute(text("SELECT title, ts_rank(search_vector, plainto_tsquery('english', 'kalam')) as rank FROM content WHERE search_vector @@ plainto_tsquery('english', 'kalam') ORDER BY rank DESC")).fetchall()
print("FTS results for 'kalam':")
for r in result:
    print(" -", r[0], "(rank:", r[1], ")")
