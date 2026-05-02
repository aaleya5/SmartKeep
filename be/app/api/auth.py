from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List

from app.db.session import get_db
from app.schemas.auth import (
    UserCreate, LoginRequest, TokenResponse, UserResponse,
    EmailVerifyRequest, ForgotPasswordRequest, ResetPasswordRequest, SocialLoginRequest
)
from app.services.auth_service import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    user = auth_service.get_current_user(credentials.credentials, db)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    if not user.is_verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Email not verified")
        
    # Enable PostgreSQL Row-Level Security for this session
    db.execute(text("SET SESSION app.current_user_id = :user_id"), {'user_id': str(user.id)})
    # Removed db.commit() to prevent 500 errors on GET requests
    
    return user


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(request: UserCreate, db: Session = Depends(get_db)):
    try:
        user = await auth_service.create_user(db, request.email, request.password)
        return user
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = auth_service.authenticate_user(db, request.email, request.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    
    if not user.is_verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Email not verified. Please check your inbox.")

    token = auth_service.create_access_token(str(user.id))
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
async def me(user=Depends(get_current_user)):
    return user


@router.post("/verify-email")
async def verify_email(request: EmailVerifyRequest, db: Session = Depends(get_db)):
    success = await auth_service.verify_email(db, request.token)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification token")
    return {"message": "Email verified successfully"}


@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    await auth_service.request_password_reset(db, request.email)
    return {"message": "If an account exists with this email, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    success = await auth_service.reset_password(db, request.token, request.new_password)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")
    return {"message": "Password reset successfully"}


@router.post("/social-login", response_model=TokenResponse)
async def social_login(request: SocialLoginRequest, db: Session = Depends(get_db)):
    try:
        email, provider_id = await auth_service.verify_social_token(request.provider, request.token)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    user = auth_service.authenticate_social_user(db, email, request.provider, provider_id)
    token = auth_service.create_access_token(str(user.id))
    return TokenResponse(access_token=token)
