"""
Authentication integration tests for SmartKeep.

These tests verify:
1. User registration works
2. Login returns a bearer token
3. Authenticated /me returns the current user
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db.base import Base
from app.models.user import User
from app.db.session import get_db

from conftest import test_engine, TestSessionLocal

engine = test_engine
TestingSessionLocal = TestSessionLocal


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="function")
def client():
    Base.metadata.create_all(bind=engine)
    yield TestClient(app)
    db = TestingSessionLocal()
    try:
        db.query(User).delete()
        db.commit()
    finally:
        db.close()


class TestAuthRoutes:
    def test_register_login_and_me(self, client):
        register_response = client.post(
            "/auth/register",
            json={
                "email": "test@example.com",
                "password": "secret123",
            },
        )
        assert register_response.status_code == 201
        user_data = register_response.json()
        assert user_data["email"] == "test@example.com"
        assert user_data["is_active"] is True

        login_response = client.post(
            "/auth/login",
            json={
                "email": "test@example.com",
                "password": "secret123",
            },
        )
        assert login_response.status_code == 200
        token_data = login_response.json()
        assert "access_token" in token_data
        assert token_data["token_type"] == "bearer"

        headers = {"Authorization": f"Bearer {token_data['access_token']}"}
        me_response = client.get("/auth/me", headers=headers)
        assert me_response.status_code == 200
        profile_data = me_response.json()
        assert profile_data["email"] == "test@example.com"
        assert profile_data["is_superuser"] is False
