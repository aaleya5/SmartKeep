import sys
sys.path.insert(0, '.')
from sqlalchemy import text
from app.db.session import get_db
db = next(get_db())
result = db.execute(text("SELECT title, search_vector FROM content WHERE title LIKE '%Kalam%'")).fetchone()
print("Result:", result)
if result:
    print("Title:", result[0])
    print("Vector:", result[1][:100] if result[1] else None)
