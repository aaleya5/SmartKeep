from sqlalchemy import text
from app.db.session import get_db

db = next(get_db())

# Test if FTS works
result = db.execute(text("""
    SELECT id, title, ts_rank(search_vector, plainto_tsquery('english', 'test')) as rank
    FROM content 
    WHERE search_vector @@ plainto_tsquery('english', 'test')
    ORDER BY rank DESC 
    LIMIT 5
""")).fetchall()
print('FTS results:', result)

# Check search_vector values
result = db.execute(text("""SELECT id, title, search_vector FROM content WHERE search_vector IS NOT NULL LIMIT 3""")).fetchall()
print('Sample search_vectors:', result)

# Count total content
result = db.execute(text("SELECT COUNT(*) FROM content")).fetchone()
print('Total content count:', result[0])
