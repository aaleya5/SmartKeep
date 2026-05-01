import logging
from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User

import secrets
from app.models.auth_token import VerificationToken, PasswordResetToken
from app.services.email_service import email_service

logger = logging.getLogger(__name__)

import bcrypt
import httpx
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

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
        try:
            # Ensure user_id is a valid UUID
            if isinstance(user_id, str):
                import uuid
                uuid.UUID(user_id)
            return db.query(User).filter(User.id == user_id).first()
        except (ValueError, AttributeError):
            return None

    def get_current_user(self, token: str, db: Session) -> Optional[User]:
        subject = self.decode_access_token(token)
        if not subject:
            return None
        return self.get_user_by_id(db, subject)

    def authenticate_user(self, db: Session, email: str, password: str) -> Optional[User]:
        user = self.get_user(db, email)
        if not user or not user.hashed_password:
            return None
        if not self.verify_password(password, user.hashed_password):
            return None
        return user

    async def create_user(self, db: Session, email: str, password: str) -> User:
        email = email.lower()
        existing = self.get_user(db, email)
        if existing:
            raise ValueError("User with this email already exists")

        # Auto-verify if no email provider is configured (local dev mode)
        email_enabled = bool(settings.RESEND_API_KEY)

        user = User(
            email=email,
            hashed_password=self.hash_password(password),
            is_active=True,
            is_verified=not email_enabled,  # Auto-verify when no email provider
            is_superuser=False,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        if email_enabled:
            # Only create token and send email when email service is configured
            token = self.create_verification_token(db, user.id)
            await email_service.send_verification_email(email, token)
        else:
            logger.info(f"No email provider configured — user {email} auto-verified for local dev")
        
        return user

    def create_verification_token(self, db: Session, user_id: str) -> str:
        token = secrets.token_urlsafe(32)
        v_token = VerificationToken(
            user_id=user_id,
            token=token,
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        db.add(v_token)
        db.commit()
        return token

    async def verify_email(self, db: Session, token: str) -> bool:
        v_token = db.query(VerificationToken).filter(VerificationToken.token == token).first()
        if not v_token or v_token.expires_at < datetime.utcnow():
            return False
        
        user = self.get_user_by_id(db, v_token.user_id)
        if not user:
            return False
            
        user.is_verified = True
        db.delete(v_token)
        db.commit()
        return True

    async def request_password_reset(self, db: Session, email: str):
        user = self.get_user(db, email)
        if not user:
            return # Don't leak user existence
            
        token = secrets.token_urlsafe(32)
        pr_token = PasswordResetToken(
            user_id=user.id,
            token=token,
            expires_at=datetime.utcnow() + timedelta(hours=1)
        )
        db.add(pr_token)
        db.commit()
        
        await email_service.send_password_reset_email(email, token)

    async def reset_password(self, db: Session, token: str, new_password: str) -> bool:
        pr_token = db.query(PasswordResetToken).filter(PasswordResetToken.token == token).first()
        if not pr_token or pr_token.expires_at < datetime.utcnow():
            return False
            
        user = self.get_user_by_id(db, pr_token.user_id)
        if not user:
            return False
            
        user.hashed_password = self.hash_password(new_password)
        db.delete(pr_token)
        db.commit()
        return True

    async def verify_social_token(self, provider: str, token: str) -> tuple[str, str]:
        """
        Verifies social token with provider APIs and returns (email, provider_id)
        """
        if provider == "google":
            if not settings.GOOGLE_CLIENT_ID:
                raise ValueError("Google login is not configured on the server")
            try:
                async with httpx.AsyncClient() as client:
                    # We accept an access_token and fetch user info
                    resp = await client.get(
                        "https://www.googleapis.com/oauth2/v3/userinfo",
                        headers={"Authorization": f"Bearer {token}"}
                    )
                    resp.raise_for_status()
                    user_data = resp.json()
                    
                    email = user_data.get("email")
                    provider_id = user_data.get("sub")
                    
                    if not email or not provider_id:
                        raise ValueError("Incomplete profile data from Google")
                    return email, provider_id
            except httpx.HTTPError as e:
                raise ValueError(f"Failed to verify Google token: {str(e)}")

        elif provider == "github":
            if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
                raise ValueError("GitHub login is not fully configured on the server")
            try:
                async with httpx.AsyncClient() as client:
                    # The 'token' parameter here is actually the authorization code from GitHub
                    token_resp = await client.post(
                        "https://github.com/login/oauth/access_token",
                        data={
                            "client_id": settings.GITHUB_CLIENT_ID,
                            "client_secret": settings.GITHUB_CLIENT_SECRET.get_secret_value(),
                            "code": token,
                        },
                        headers={"Accept": "application/json"}
                    )
                    token_resp.raise_for_status()
                    token_data = token_resp.json()
                    
                    if "error" in token_data:
                        raise ValueError(f"GitHub token exchange failed: {token_data.get('error_description', token_data['error'])}")
                        
                    access_token = token_data.get("access_token")
                    if not access_token:
                        raise ValueError("No access token returned from GitHub")

                    # Fetch user details
                    headers = {
                        "Authorization": f"token {access_token}",
                        "Accept": "application/vnd.github.v3+json",
                    }
                    user_resp = await client.get("https://api.github.com/user", headers=headers)
                    user_resp.raise_for_status()
                    user_data = user_resp.json()
                    provider_id = str(user_data.get("id"))
                    
                    # Fetch emails since user_data['email'] could be null
                    emails_resp = await client.get("https://api.github.com/user/emails", headers=headers)
                    emails_resp.raise_for_status()
                    emails_data = emails_resp.json()
                    
                    primary_email = None
                    for em in emails_data:
                        if em.get("primary") and em.get("verified"):
                            primary_email = em.get("email")
                            break
                    if not primary_email and emails_data:
                        primary_email = emails_data[0].get("email")
                        
                    if not primary_email:
                        raise ValueError("No verified email found in GitHub account")
                    
                    return primary_email, provider_id
            except httpx.HTTPError as e:
                raise ValueError(f"Failed to verify GitHub token: {str(e)}")

        else:
            raise ValueError(f"Unsupported provider: {provider}")

    def authenticate_social_user(self, db: Session, email: str, provider: str, provider_id: str) -> User:
        user = self.get_user(db, email)
        if user:
            # Link existing user if not already linked
            if provider == "google" and not user.google_id:
                user.google_id = provider_id
            elif provider == "github" and not user.github_id:
                user.github_id = provider_id
            
            # Social login implicitly verifies email if the provider confirms it
            user.is_verified = True
            db.commit()
            return user
            
        # Create new social user
        user = User(
            email=email.lower(),
            is_active=True,
            is_verified=True,
            is_superuser=False,
        )
        if provider == "google":
            user.google_id = provider_id
        elif provider == "github":
            user.github_id = provider_id
            
        db.add(user)
        db.commit()
        db.refresh(user)
        return user


auth_service = AuthService()
