from sqlalchemy import text
from app.services.auth_service import AuthService
from app.db.session import get_db

db = next(get_db())

# Create a test user if none exists
result = db.execute(text('SELECT id FROM users LIMIT 1')).fetchone()
if result:
    user_id = result[0]
else:
    db.execute(text('INSERT INTO users (email, password_hash, is_verified) VALUES ("test@example.com", "hash", true)'))
    db.commit()
    result = db.execute(text('SELECT id FROM users WHERE email = "test@example.com"')).fetchone()
    user_id = result[0]

# Create a token
auth_service = AuthService()
token = auth_service.create_access_token(str(user_id))
print('Token:', token)
