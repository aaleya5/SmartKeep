import logging
from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User

logger = logging.getLogger(__name__)

import bcrypt

class AuthService:
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )

    def hash_password(self, password: str) -> str:
        return bcrypt.hashpw(
            password.encode('utf-8'),
            bcrypt.gensalt()
        ).decode('utf-8')

    def create_access_token(self, subject: str) -> str:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        payload = {
            "sub": subject,
            "exp": expire,
        }
        return jwt.encode(payload, settings.JWT_SECRET_KEY.get_secret_value(), algorithm=settings.JWT_ALGORITHM)

    def decode_access_token(self, token: str) -> Optional[str]:
        try:
            payload = jwt.decode(token, settings.JWT_SECRET_KEY.get_secret_value(), algorithms=[settings.JWT_ALGORITHM])
            return payload.get("sub")
        except JWTError as exc:
            logger.warning(f"Invalid JWT token: {exc}")
            return None

    def get_user(self, db: Session, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email.lower()).first()

    def get_user_by_id(self, db: Session, user_id: str) -> Optional[User]:
        return db.query(User).filter(User.id == user_id).first()

    def get_current_user(self, token: str, db: Session) -> Optional[User]:
        subject = self.decode_access_token(token)
        if not subject:
            return None
        return self.get_user_by_id(db, subject)

    def authenticate_user(self, db: Session, email: str, password: str) -> Optional[User]:
        user = self.get_user(db, email)
        if not user:
            return None
        if not self.verify_password(password, user.hashed_password):
            return None
        return user

    def create_user(self, db: Session, email: str, password: str) -> User:
        email = email.lower()
        existing = self.get_user(db, email)
        if existing:
            raise ValueError("User with this email already exists")

        user = User(
            email=email,
            hashed_password=self.hash_password(password),
            is_active=True,
            is_superuser=False,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user


auth_service = AuthService()
