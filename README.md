# SmartKeep

Your Personal Knowledge Management System

## Status: Week 6 Complete ✅

### What's Implemented

#### Backend (FastAPI + PostgreSQL)
- **API Endpoints**:
  - `POST /content/url` - Save content from URL
  - `POST /content/manual` - Save content manually
  - `GET /documents/` - Get all documents
  - `GET /search/search` - Search with BM25 or TF-IDF
  
- **Features**:
  - Duplicate URL detection (returns 409 error)
  - Content length limit (10KB max, auto-truncation)
  - Database indexes on domain, created_at, source_url
  - Connection pooling for performance
  - Tags field for future filtering

- **Testing**:
  - Integration tests with pytest + FastAPI TestClient
  - Test scenarios: save→search, duplicate URL, empty results, invalid URL

#### Frontend (React + Vite)
- **UI Features**:
  - Loading spinners for all operations
  - Empty state when no documents or search results
  - Error boundary for graceful error handling
  - Latency display for search performance
  - Better error messages

## Running the Project

### Backend
```bash
cd be
pip install -r requirements.txt
# Run migrations
alembic upgrade head
# Start server
uvicorn app.main:app --reload
```

### Frontend
```bash
cd fe
npm install
npm run dev
```

### Run Tests
```bash
cd be
pytest tests/ -v
```

## Previous Weeks Summary
- Week 1-3: Basic CRUD, web scraping, error handling
- Week 4: BM25 and TF-IDF search
- Week 5: React frontend
- Week 6: Integration testing, UX improvements, performance optimization
