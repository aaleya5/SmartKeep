"""
Pytest configuration for SmartKeep backend tests.

This file ensures the correct Python path is set up for imports
and provides shared test fixtures.
"""
import sys
from pathlib import Path

# Add the be directory to Python path so 'app' imports work
# This allows running pytest from the be directory: pytest tests/ -v
be_dir = Path(__file__).parent.parent
sys.path.insert(0, str(be_dir))

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Create a shared in-memory database for all tests
# StaticPool ensures all connections use the same database
TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="function")
def db_engine():
    """Provide a shared test database engine."""
    return test_engine
