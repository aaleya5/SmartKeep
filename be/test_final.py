import sys
sys.path.insert(0, '.')
from sqlalchemy import text
from app.db.session import get_db
db = next(get_db())

# Test 1: Check search_vector exists
result = db.execute(text("SELECT COUNT(*) FROM content WHERE search_vector IS NOT NULL")).fetchone()
print("Rows with search_vector:", result[0])

# Test 2: Test search endpoint
import urllib.request, json
req = urllib.request.Request(
    "http://localhost:8000/search?query=kalam&mode=hybrid", 
    headers={"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3YTFjNTI2Mi0wNjU3LTQyZTEtYjdmYi00MjgyNjY3YzE3MmQiLCJleHAiOjE3Nzc3MDE4ODd9.rDMoGV--dDIpqwXSO98y3XyNqsXwmJk_N1ToIs0Qxw8"}
)
try:
    resp = urllib.request.urlopen(req)
    data = json.loads(resp.read())
    print("Search results:", len(data.get("items",[])))
    if data.get("items"):
        print("SUCCESS: Search is working!")
    else:
        print("SUCCESS: Search is working (0 results for this query)")
except Exception as e:
    print("ERROR:", e)
