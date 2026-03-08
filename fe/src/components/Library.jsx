import { useState, useEffect, useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import HoverPreview from './common/HoverPreview';
import ShimmerCard from './common/ShimmerCard';
import usePullToRefresh from '../hooks/usePullToRefresh';

/**
 * Library component with virtualization, hover preview, and pull-to-refresh
 */
function Library({
  documents = [],
  collections = [],
  tags = [],
  onSelectDocument,
  onAddToCollection,
  onDeleteDocument,
  onBulkAction,
  onRefresh
}) {
  // View mode
  const [viewMode, setViewMode] = useState('grid');
  
  // Filter states
  const [selectedCollections, setSelectedCollections] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedDomains, setSelectedDomains] = useState([]);
  const [dateRange, setDateRange] = useState('all');
  const [readingTime, setReadingTime] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [status, setStatus] = useState('all');
  
  // Sort state
  const [sortBy, setSortBy] = useState('newest');
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectAllPage, setSelectAllPage] = useState(false);
  
  // Show back to top
  const [showBackToTop, setShowBackToTop] = useState(false);
  
  // Filter panel visibility
  const [showFilters, setShowFilters] = useState(true);
  
  // Optimistic state for pending saves
  const [pendingDocuments, setPendingDocuments] = useState([]);
  const [failedSaveIds, setFailedSaveIds] = useState(new Set());

  // Parent ref for virtualizer
  const parentRef = useRef(null);

  // Pull-to-refresh
  const { isRefreshing, isPulling, pullDistance, pullProgress } = usePullToRefresh({
    onRefresh: onRefresh || (() => Promise.resolve()),
    enabled: true,
  });

  // Use actual documents passed from parent, with pending documents shown optimistically
  const allDocs = [...pendingDocuments, ...documents];

  // Get unique domains from documents
  const allDomains = [...new Set(allDocs.map(doc => doc.domain))];
  
  // All available tags
  const allTags = [...new Set(allDocs.flatMap(doc => doc.tags || []))];

  // Virtualizer
  const virtualizer = useVirtualizer({
    count: allDocs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(() => {
      if (viewMode === 'grid') return 320;
      if (viewMode === 'list') return 80;
      return 56;
    }, [viewMode]),
    overscan: 5,
  });

  // Filter documents
  const filteredDocs = allDocs.filter(doc => {
    // Skip pending documents in filters (they don't have full data yet)
    if (doc.isPending) return true;
    
    // Collection filter
    if (selectedCollections.length > 0 && !selectedCollections.includes(doc.collection_id)) {
      return false;
    }
    
    // Tags filter
    if (selectedTags.length > 0 && !selectedTags.some(tag => doc.tags?.includes(tag))) {
      return false;
    }
    
    // Domain filter
    if (selectedDomains.length > 0 && !selectedDomains.includes(doc.domain)) {
      return false;
    }
    
    // Date range filter
    if (dateRange !== 'all') {
      const docDate = new Date(doc.saved_date);
      const now = new Date();
      const daysDiff = Math.floor((now - docDate) / (1000 * 60 * 60 * 24));
      
      switch (dateRange) {
        case 'today':
          if (daysDiff > 0) return false;
          break;
        case 'week':
          if (daysDiff > 7) return false;
          break;
        case 'month':
          if (daysDiff > 30) return false;
          break;
        case '3months':
          if (daysDiff > 90) return false;
          break;
      }
    }
    
    // Reading time filter
    if (readingTime !== 'all') {
      switch (readingTime) {
        case 'under3':
          if (doc.reading_time >= 3) return false;
          break;
        case '3to10':
          if (doc.reading_time < 3 || doc.reading_time > 10) return false;
          break;
        case 'over10':
          if (doc.reading_time <= 10) return false;
          break;
      }
    }
    
    // Difficulty filter
    if (difficulty !== 'all') {
      const score = doc.difficulty_score || 50;
      switch (difficulty) {
        case 'easy':
          if (score < 60) return false;
          break;
        case 'intermediate':
          if (score < 30 || score >= 60) return false;
          break;
        case 'advanced':
          if (score >= 30) return false;
          break;
      }
    }
    
    // Status filter
    switch (status) {
      case 'unread':
        if (doc.is_read) return false;
        break;
      case 'read':
        if (!doc.is_read) return false;
        break;
      case 'annotated':
        if (!doc.is_annotated) return false;
        break;
      case 'truncated':
        if (!doc.is_truncated) return false;
        break;
    }
    
    return true;
  });

  // Sort documents
  const sortedDocs = [...filteredDocs].sort((a, b) => {
    // Pending documents always at top
    if (a.isPending && !b.isPending) return -1;
    if (!a.isPending && b.isPending) return 1;
    
    switch (sortBy) {
      case 'newest':
        return new Date(b.saved_date) - new Date(a.saved_date);
      case 'oldest':
        return new Date(a.saved_date) - new Date(b.saved_date);
      case 'recently_opened':
        return (b.last_opened_at || 0) - (a.last_opened_at || 0);
      case 'never_opened':
        return (a.last_opened_at || 0) - (b.last_opened_at || 0) || 0;
      case 'shortest':
        return (a.reading_time || 0) - (b.reading_time || 0);
      case 'longest':
        return (b.reading_time || 0) - (a.reading_time || 0);
      case 'most_annotated':
        return (b.is_annotated ? 1 : 0) - (a.is_annotated ? 1 : 0);
      case 'az':
        return a.title.localeCompare(b.title);
      case 'za':
        return b.title.localeCompare(a.title);
      default:
        return 0;
    }
  });

  // Update virtualizer count
  useEffect(() => {
    virtualizer.setCount(sortedDocs.length);
  }, [sortedDocs.length, virtualizer]);

  // Back to top visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > window.innerHeight * 3);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Clear all filters
  const clearFilters = () => {
    setSelectedCollections([]);
    setSelectedTags([]);
    setSelectedDomains([]);
    setDateRange('all');
    setReadingTime('all');
    setDifficulty('all');
    setStatus('all');
  };

  // Toggle selection
  const toggleSelect = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Select all on page
  const handleSelectAllPage = () => {
    if (selectAllPage) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedDocs.filter(d => !d.isPending).map(d => d.id)));
    }
    setSelectAllPage(!selectAllPage);
  };

  // Bulk action handlers
  const handleBulkAddToCollection = () => {
    if (onBulkAction) {
      onBulkAction('addToCollection', Array.from(selectedIds));
    }
  };

  const handleBulkAddTags = () => {
    if (onBulkAction) {
      onBulkAction('addTags', Array.from(selectedIds));
    }
  };

  const handleBulkDelete = () => {
    if (onBulkAction && confirm(`Delete ${selectedIds.size} items?`)) {
      onBulkAction('delete', Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const handleBulkExport = (format) => {
    if (onBulkAction) {
      onBulkAction('export', Array.from(selectedIds), format);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getDifficultyLabel = (score) => {
    if (score >= 60) return 'Easy';
    if (score >= 30) return 'Intermediate';
    return 'Advanced';
  };

  const getDifficultyClass = (score) => {
    if (score >= 60) return 'badge-easy';
    if (score >= 30) return 'badge-intermediate';
    return 'badge-advanced';
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const activeFiltersCount = 
    selectedCollections.length + 
    selectedTags.length + 
    selectedDomains.length + 
    (dateRange !== 'all' ? 1 : 0) + 
    (readingTime !== 'all' ? 1 : 0) + 
    (difficulty !== 'all' ? 1 : 0) + 
    (status !== 'all' ? 1 : 0);

  // Render card content with hover preview
  const renderCardContent = (doc, isGrid = true) => {
    if (doc.isPending) {
      return isGrid ? (
        <ShimmerCard variant="grid" />
      ) : (
        <ShimmerCard variant={viewMode} />
      );
    }

    const hasFailed = failedSaveIds.has(doc.id);

    const CardContent = (
      <div className={`doc-card ${viewMode} ${selectedIds.has(doc.id) ? 'selected' : ''} ${hasFailed ? 'shake' : ''}`}>
        {/* Selection Checkbox */}
        <label 
          className="doc-checkbox"
          onClick={(e) => e.stopPropagation()}
        >
          <input 
            type="checkbox" 
            checked={selectedIds.has(doc.id)}
            onChange={() => toggleSelect(doc.id)}
          />
        </label>

        {viewMode === 'grid' && (
          <>
            <div className="doc-thumbnail">
              <span className="thumbnail-emoji">{doc.favicon}</span>
            </div>
            <div className="doc-content">
              <div className="doc-meta-row">
                <span className="doc-favicon">{doc.favicon}</span>
                <span className="doc-domain">{doc.domain}</span>
                <span className="doc-date">{formatDate(doc.saved_date)}</span>
              </div>
              <h3 className="doc-title">{doc.title}</h3>
              <p className="doc-summary">{doc.summary}</p>
              <div className="doc-badges">
                <span className="reading-badge">📖 {doc.reading_time} min</span>
                <span className={`difficulty-badge ${getDifficultyClass(doc.difficulty_score)}`}>
                  {getDifficultyLabel(doc.difficulty_score)}
                </span>
                {doc.is_annotated && <span className="status-badge annotated">✓ Annotated</span>}
                {doc.is_truncated && <span className="status-badge truncated">⚠ Truncated</span>}
              </div>
              <div className="doc-tags">
                {doc.tags?.slice(0, 3).map((tag, idx) => (
                  <span key={idx} className="tag">{tag}</span>
                ))}
              </div>
            </div>
          </>
        )}

        {viewMode === 'list' && (
          <div className="doc-list-row">
            <span className="list-favicon">{doc.favicon}</span>
            <span className="list-title">{doc.title}</span>
            <span className="list-domain">{doc.domain}</span>
            <span className="list-date">{formatDate(doc.saved_date)}</span>
            <span className="list-time">{doc.reading_time} min</span>
            <span className="list-tags">
              {doc.tags?.slice(0, 2).map((tag, idx) => (
                <span key={idx} className="tag">{tag}</span>
              ))}
            </span>
          </div>
        )}

        {viewMode === 'compact' && (
          <div className="doc-compact-row">
            <span className="compact-favicon">{doc.favicon}</span>
            <span className="compact-title">{doc.title}</span>
            <span className="compact-domain">{doc.domain}</span>
            <span className="compact-date">{formatDate(doc.saved_date)}</span>
          </div>
        )}
      </div>
    );

    // Wrap with hover preview for summary
    if (doc.summary && !doc.isPending) {
      return (
        <HoverPreview content={doc.summary} delay={500}>
          {CardContent}
        </HoverPreview>
      );
    }

    return CardContent;
  };

  return (
    <div className="library">
      {/* Pull to refresh indicator */}
      <div 
        className={`pull-to-refresh ${isPulling || isRefreshing ? 'active' : ''}`}
        style={{ height: isPulling ? pullDistance : isRefreshing ? 80 : 0 }}
      >
        <div className="pull-indicator">
          {isRefreshing ? (
            <div className="spinner"></div>
          ) : (
            <span className="pull-arrow" style={{ transform: `rotate(${pullProgress * 180}deg)` }}>
              ↓
            </span>
          )}
          <span>{isRefreshing ? 'Refreshing...' : 'Pull to refresh'}</span>
        </div>
      </div>

      {/* Header with view toggle and sort */}
      <div className="library-header">
        <div className="header-left">
          <h2>Library</h2>
          <span className="doc-count">{sortedDocs.length} items</span>
          {pendingDocuments.length > 0 && (
            <span className="pending-count">{pendingDocuments.length} pending</span>
          )}
        </div>
        
        <div className="header-right">
          {/* Sort Dropdown */}
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="newest">Newest saved</option>
            <option value="oldest">Oldest saved</option>
            <option value="recently_opened">Most recently opened</option>
            <option value="never_opened">Never opened</option>
            <option value="shortest">Shortest read</option>
            <option value="longest">Longest read</option>
            <option value="most_annotated">Most annotated</option>
            <option value="az">Alphabetical (A-Z)</option>
            <option value="za">Alphabetical (Z-A)</option>
          </select>

          {/* View Toggle */}
          <div className="view-toggle">
            <button 
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              ⊞
            </button>
            <button 
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              ☰
            </button>
            <button 
              className={`view-btn ${viewMode === 'compact' ? 'active' : ''}`}
              onClick={() => setViewMode('compact')}
              title="Compact view"
            >
              ≡
            </button>
          </div>

          {/* Filter Toggle */}
          <button 
            className={`filter-toggle ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            ☑ Filters
            {activeFiltersCount > 0 && (
              <span className="filter-badge">{activeFiltersCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="filter-panel">
          <div className="filter-row">
            {/* Collections */}
            <div className="filter-group">
              <label>Collection</label>
              <select 
                multiple
                value={selectedCollections}
                onChange={(e) => setSelectedCollections(Array.from(e.target.selectedOptions, o => o.value))}
                className="filter-multi-select"
              >
                {collections.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div className="filter-group">
              <label>Tags</label>
              <select 
                multiple
                value={selectedTags}
                onChange={(e) => setSelectedTags(Array.from(e.target.selectedOptions, o => o.value))}
                className="filter-multi-select"
              >
                {allTags.map(tag => (
                  <option key={tag} value={tag}>{tag} ({allDocs.filter(d => d.tags?.includes(tag)).length})</option>
                ))}
              </select>
            </div>

            {/* Domain */}
            <div className="filter-group">
              <label>Domain</label>
              <select 
                multiple
                value={selectedDomains}
                onChange={(e) => setSelectedDomains(Array.from(e.target.selectedOptions, o => o.value))}
                className="filter-multi-select"
              >
                {allDomains.map(domain => (
                  <option key={domain} value={domain}>{domain}</option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div className="filter-group">
              <label>Date Range</label>
              <select 
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="filter-select"
              >
                <option value="all">All time</option>
                <option value="today">Today</option>
                <option value="week">This week</option>
                <option value="month">This month</option>
                <option value="3months">Last 3 months</option>
              </select>
            </div>

            {/* Reading Time */}
            <div className="filter-group">
              <label>Reading Time</label>
              <select 
                value={readingTime}
                onChange={(e) => setReadingTime(e.target.value)}
                className="filter-select"
              >
                <option value="all">Any</option>
                <option value="under3">Under 3 min</option>
                <option value="3to10">3-10 min</option>
                <option value="over10">10+ min</option>
              </select>
            </div>

            {/* Difficulty */}
            <div className="filter-group">
              <label>Difficulty</label>
              <select 
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="filter-select"
              >
                <option value="all">All</option>
                <option value="easy">Easy</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            {/* Status */}
            <div className="filter-group">
              <label>Status</label>
              <select 
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="filter-select"
              >
                <option value="all">All</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
                <option value="annotated">Annotated</option>
                <option value="truncated">Truncated</option>
              </select>
            </div>
          </div>

          {activeFiltersCount > 0 && (
            <button className="clear-filters-btn" onClick={clearFilters}>
              Clear all filters ({activeFiltersCount})
            </button>
          )}
        </div>
      )}

      {/* Bulk Action Toolbar */}
      {selectedIds.size > 0 && (
        <div className="bulk-toolbar">
          <span className="selection-count">{selectedIds.size} selected</span>
          
          <label className="bulk-checkbox">
            <input 
              type="checkbox" 
              checked={selectAllPage}
              onChange={handleSelectAllPage}
            />
            Select all on page
          </label>
          
          <div className="bulk-actions">
            <button onClick={handleBulkAddToCollection}>Add to Collection</button>
            <button onClick={handleBulkAddTags}>Add Tags</button>
            <button onClick={() => handleBulkExport('markdown')}>Export Markdown</button>
            <button onClick={() => handleBulkExport('json')}>Export JSON</button>
            <button className="delete-btn" onClick={handleBulkDelete}>Delete</button>
          </div>
        </div>
      )}

      {/* Document Grid/List with Virtualization */}
      <div 
        ref={parentRef}
        className={`documents-${viewMode} virtualized`}
        style={{ height: '600px', overflow: 'auto' }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const doc = sortedDocs[virtualRow.index];
            return (
              <div
                key={doc.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                  padding: viewMode === 'grid' ? '0.5rem' : '0.25rem',
                  boxSizing: 'border-box',
                }}
                onClick={() => !doc.isPending && onSelectDocument && onSelectDocument(doc)}
              >
                {renderCardContent(doc, viewMode === 'grid')}
              </div>
            );
          })}
        </div>
      </div>

      {/* Empty State - No Documents */}
      {sortedDocs.length === 0 && allDocs.length === 0 && !pendingDocuments.length && (
        <div className="empty-state-library">
          <div className="empty-icon">📚</div>
          <h3>Your library is empty</h3>
          <p>Start saving content from URLs or add your own notes to build your personal knowledge base.</p>
        </div>
      )}

      {/* No Results - Filters applied but no matches */}
      {sortedDocs.length === 0 && (allDocs.length > 0 || pendingDocuments.length > 0) && (
        <div className="no-results">
          <p>No documents match your filters.</p>
          <button onClick={clearFilters}>Clear filters</button>
        </div>
      )}

      {/* Back to Top Button */}
      {showBackToTop && (
        <button className="back-to-top" onClick={scrollToTop}>
          ↑
        </button>
      )}

      <style>{`
        .library {
          max-width: 1200px;
          margin: 0 auto;
        }

        /* Pull to refresh */
        .pull-to-refresh {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: linear-gradient(180deg, #6366f1 0%, #818cf8 100%);
          z-index: 1000;
          overflow: hidden;
          transition: height 0.3s ease-out;
        }

        .pull-to-refresh.active {
          display: block;
        }

        .pull-indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 80px;
          color: white;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .pull-arrow {
          font-size: 1.5rem;
          transition: transform 0.3s ease-out;
          display: inline-block;
          margin-bottom: 0.25rem;
        }

        .pull-to-refresh .spinner {
          width: 24px;
          height: 24px;
          border: 3px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        /* Header */
        .library-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .header-left {
          display: flex;
          align-items: baseline;
          gap: 0.75rem;
        }

        .header-left h2 {
          margin: 0;
          font-size: 1.5rem;
          color: #1f2937;
        }

        .doc-count {
          color: #9ca3af;
          font-size: 0.9rem;
        }

        .pending-count {
          color: #6366f1;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .sort-select {
          padding: 0.5rem 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          font-size: 0.9rem;
          cursor: pointer;
        }

        .view-toggle {
          display: flex;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }

        .view-btn {
          padding: 0.5rem 0.75rem;
          border: none;
          background: white;
          cursor: pointer;
          font-size: 1rem;
          transition: background 0.2s;
        }

        .view-btn:hover {
          background: #f3f4f6;
        }

        .view-btn.active {
          background: #667eea;
          color: white;
        }

        .filter-toggle {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          font-size: 0.9rem;
        }

        .filter-toggle.active {
          background: #667eea;
          color: white;
          border-color: #667eea;
        }

        .filter-badge {
          background: white;
          color: #667eea;
          padding: 0.1rem 0.4rem;
          border-radius: 10px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .filter-toggle.active .filter-badge {
          background: rgba(255,255,255,0.3);
          color: white;
        }

        /* Filter Panel */
        .filter-panel {
          background: white;
          border-radius: 12px;
          padding: 1.25rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .filter-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .filter-group label {
          font-size: 0.8rem;
          font-weight: 500;
          color: #6b7280;
        }

        .filter-select,
        .filter-multi-select {
          padding: 0.5rem;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 0.85rem;
          background: white;
        }

        .filter-multi-select {
          height: 80px;
        }

        .clear-filters-btn {
          margin-top: 1rem;
          padding: 0.5rem 1rem;
          background: #f3f4f6;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.85rem;
          color: #6b7280;
        }

        .clear-filters-btn:hover {
          background: #e5e7eb;
        }

        /* Bulk Toolbar */
        .bulk-toolbar {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1rem;
          background: #e0e7ff;
          border-radius: 8px;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }

        .selection-count {
          font-weight: 500;
          color: #667eea;
        }

        .bulk-checkbox {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.85rem;
          color: #6b7280;
        }

        .bulk-actions {
          display: flex;
          gap: 0.5rem;
          margin-left: auto;
          flex-wrap: wrap;
        }

        .bulk-actions button {
          padding: 0.4rem 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          font-size: 0.8rem;
          transition: all 0.2s;
        }

        .bulk-actions button:hover {
          background: #f3f4f6;
        }

        .bulk-actions .delete-btn {
          color: #dc2626;
          border-color: #fecaca;
        }

        .bulk-actions .delete-btn:hover {
          background: #fee2e2;
        }

        /* Documents Grid */
        .documents-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        @media (max-width: 900px) {
          .documents-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 600px) {
          .documents-grid {
            grid-template-columns: 1fr;
          }
        }

        .doc-card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          position: relative;
        }

        .doc-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.12);
        }

        .doc-card.selected {
          outline: 2px solid #667eea;
        }

        .doc-card.shake {
          animation: shake 0.5s ease-in-out;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }

        .doc-checkbox {
          position: absolute;
          top: 0.75rem;
          left: 0.75rem;
          z-index: 10;
        }

        .doc-checkbox input {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .doc-thumbnail {
          height: 120px;
          background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
        }

        .doc-content {
          padding: 1rem;
        }

        .doc-meta-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: #9ca3af;
          margin-bottom: 0.5rem;
        }

        .doc-title {
          font-size: 1rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 0.5rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .doc-summary {
          font-size: 0.8rem;
          color: #6b7280;
          margin-bottom: 0.75rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .doc-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
          margin-bottom: 0.5rem;
        }

        .reading-badge,
        .difficulty-badge,
        .status-badge {
          font-size: 0.7rem;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
        }

        .reading-badge {
          background: #f3f4f6;
          color: #6b7280;
        }

        .badge-easy { background: #d1fae5; color: #059669; }
        .badge-intermediate { background: #fef3c7; color: #d97706; }
        .badge-advanced { background: #fee2e2; color: #dc2626; }

        .status-badge.annotated { background: #d1fae5; color: #059669; }
        .status-badge.truncated { background: #fef3c7; color: #d97706; }

        .doc-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
        }

        .doc-tags .tag {
          font-size: 0.65rem;
          padding: 0.15rem 0.4rem;
          background: #e0e7ff;
          color: #667eea;
          border-radius: 8px;
        }

        /* List View */
        .documents-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .documents-list .doc-card {
          border-radius: 8px;
        }

        .doc-list-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1rem;
        }

        .list-favicon {
          font-size: 1.25rem;
        }

        .list-title {
          flex: 1;
          font-weight: 500;
          color: #1f2937;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .list-domain {
          width: 120px;
          font-size: 0.8rem;
          color: #9ca3af;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .list-date {
          width: 80px;
          font-size: 0.8rem;
          color: #9ca3af;
        }

        .list-time {
          width: 50px;
          font-size: 0.8rem;
          color: #9ca3af;
        }

        .list-tags {
          display: flex;
          gap: 0.25rem;
        }

        /* Compact View */
        .documents-compact {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .documents-compact .doc-card {
          border-radius: 4px;
        }

        .doc-compact-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 0.75rem;
        }

        .compact-favicon {
          font-size: 1rem;
        }

        .compact-title {
          flex: 1;
          font-size: 0.9rem;
          color: #1f2937;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .compact-domain {
          width: 100px;
          font-size: 0.8rem;
          color: #9ca3af;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .compact-date {
          width: 80px;
          font-size: 0.8rem;
          color: #9ca3af;
        }

        /* No Results */
        .no-results {
          text-align: center;
          padding: 3rem;
          color: #9ca3af;
        }

        .no-results button {
          margin-top: 1rem;
          padding: 0.5rem 1rem;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }

        /* Empty State Library */
        .empty-state-library {
          text-align: center;
          padding: 4rem 2rem;
          color: #6b7280;
        }

        .empty-state-library .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .empty-state-library h3 {
          font-size: 1.25rem;
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .empty-state-library p {
          max-width: 400px;
          margin: 0 auto;
          line-height: 1.6;
        }

        /* Back to Top */
        .back-to-top {
          position: fixed;
          bottom: 80px;
          right: 20px;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #667eea;
          color: white;
          border: none;
          font-size: 1.25rem;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(102,126,234,0.4);
          transition: transform 0.2s;
          z-index: 50;
        }

        .back-to-top:hover {
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
}

export default Library;
