import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collectionAPI, searchAPI } from '../services/api';

// Add Items Modal Component
function AddItemsModal({ isOpen, onClose, collectionId, onItemsAdded }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedIds(new Set());
    }
  }, [isOpen]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await searchAPI.search(searchQuery, 'keyword', { limit: 20 });
        // Filter out items already in the collection
        setSearchResults(response.data.items || []);
      } catch (err) {
        console.error('Search failed:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery]);

  const toggleSelect = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleAdd = async () => {
    if (selectedIds.size === 0) return;

    setIsAdding(true);
    try {
      await collectionAPI.addDocuments(collectionId, Array.from(selectedIds));
      if (onItemsAdded) {
        onItemsAdded();
      }
      onClose();
    } catch (err) {
      console.error('Failed to add items:', err);
    } finally {
      setIsAdding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="add-items-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Items to Collection</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="search-section">
          <input
            type="text"
            placeholder="Search your saved items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            className="search-input"
          />
          {isSearching && <div className="search-spinner"></div>}
        </div>

        <div className="results-list">
          {searchResults.length === 0 && searchQuery && !isSearching && (
            <div className="no-results">No items found matching "{searchQuery}"</div>
          )}
          
          {searchResults.length === 0 && !searchQuery && (
            <div className="search-hint">Start typing to search your library</div>
          )}

          {searchResults.map((item) => (
            <div
              key={item.id}
              className={`result-item ${selectedIds.has(item.id) ? 'selected' : ''}`}
              onClick={() => toggleSelect(item.id)}
            >
              <div className="result-checkbox">
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.id)}
                  onChange={() => {}}
                />
              </div>
              <div className="result-favicon">
                {item.favicon_url ? (
                  <img src={item.favicon_url} alt="" />
                ) : (
                  <span>📄</span>
                )}
              </div>
              <div className="result-content">
                <div className="result-title">{item.title}</div>
                <div className="result-domain">{item.domain}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="modal-footer">
          <span className="selected-count">
            {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <div className="footer-actions">
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleAdd}
              disabled={selectedIds.size === 0 || isAdding}
            >
              {isAdding ? 'Adding...' : `Add ${selectedIds.size} Item${selectedIds.size !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Collection Detail Page Component
function CollectionDetailPage({ collection: collectionProp, onNavigate, onBack }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [collection, setCollection] = useState(collectionProp || null);
  const [collectionLoading, setCollectionLoading] = useState(!collectionProp);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [description, setDescription] = useState(collectionProp?.description || '');
  const [showAddItems, setShowAddItems] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch collection metadata if not passed as prop
  useEffect(() => {
    if (!collectionProp && id) {
      setCollectionLoading(true);
      collectionAPI.get(id)
        .then(res => {
          setCollection(res.data);
          setDescription(res.data.description || '');
        })
        .catch(err => console.error('Failed to load collection:', err))
        .finally(() => setCollectionLoading(false));
    }
  }, [id, collectionProp]);
  
  // View mode
  const [viewMode, setViewMode] = useState('grid');
  
  // Filter states
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedDomains, setSelectedDomains] = useState([]);
  const [dateRange, setDateRange] = useState('all');
  const [readingTime, setReadingTime] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [status, setStatus] = useState('all');
  
  // Sort state
  const [sortBy, setSortBy] = useState('newest');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);

  const fetchDocuments = async () => {
    if (!collection?.id) return;
    setIsLoading(true);
    try {
      const response = await collectionAPI.getContent(
        collection.id,
        page,
        pageSize,
        sortBy === 'recently_opened' ? 'last_opened' : sortBy
      );
      setDocuments(response.data.items || []);
      setTotal(response.data.total || 0);
      setHasNext(response.data.has_next || false);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (collection?.id) {
      fetchDocuments();
    }
  }, [collection?.id, page, sortBy]);

  // Get unique domains and tags from documents
  const allDomains = [...new Set(documents.map(doc => doc.domain).filter(Boolean))];
  const allTags = [...new Set(documents.flatMap(doc => doc.tags || []))];

  // Filter documents locally
  const filteredDocs = documents.filter(doc => {
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
      const docDate = new Date(doc.created_at);
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
          if (doc.reading_time_minutes >= 3) return false;
          break;
        case '3to10':
          if (!doc.reading_time_minutes || doc.reading_time_minutes < 3 || doc.reading_time_minutes > 10) return false;
          break;
        case 'over10':
          if (!doc.reading_time_minutes || doc.reading_time_minutes <= 10) return false;
          break;
      }
    }
    
    // Difficulty filter
    if (difficulty !== 'all') {
      const score = doc.difficulty || 50;
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
      case 'truncated':
        if (!doc.is_truncated) return false;
        break;
    }
    
    return true;
  });

  const handleSaveDescription = async () => {
    try {
      await collectionAPI.update(collection.id, { description });
      setIsEditingDescription(false);
    } catch (err) {
      console.error('Failed to update description:', err);
    }
  };

  const handleDeleteCollection = async () => {
    try {
      await collectionAPI.delete(collection.id);
      navigate('/app/collections');
    } catch (err) {
      console.error('Failed to delete collection:', err);
    }
  };

  const handleRemoveFromCollection = async (contentId) => {
    try {
      await collectionAPI.removeDocument(collection.id, contentId);
      fetchDocuments();
    } catch (err) {
      console.error('Failed to remove item:', err);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const activeFiltersCount = 
    selectedTags.length + 
    selectedDomains.length + 
    (dateRange !== 'all' ? 1 : 0) + 
    (readingTime !== 'all' ? 1 : 0) + 
    (difficulty !== 'all' ? 1 : 0) + 
    (status !== 'all' ? 1 : 0);

  const clearFilters = () => {
    setSelectedTags([]);
    setSelectedDomains([]);
    setDateRange('all');
    setReadingTime('all');
    setDifficulty('all');
    setStatus('all');
  };

  // Show loading while fetching collection metadata
  if (collectionLoading) {
    return (
      <div className="loading-state" style={{ padding: '80px', textAlign: 'center' }}>
        <div className="spinner" />
        <span>Loading collection...</span>
      </div>
    );
  }

  if (!collection) {
    return (
      <div style={{ padding: '80px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Collection not found.
      </div>
    );
  }

  return (
    <div className="collection-detail-page">
      {/* Collection Header */}
      <div className="collection-header">
        <button className="back-btn" onClick={() => navigate('/app/collections')}>
          ← Back to Collections
        </button>
        
        <div className="collection-info">
          <div className="collection-icon-wrapper" style={{ backgroundColor: collection.color }}>
            <span className="collection-icon">{collection.icon}</span>
          </div>
          
          <div className="collection-details">
            <h1>{collection.name}</h1>
            
            {isEditingDescription ? (
              <div className="description-edit">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description..."
                  rows={2}
                  autoFocus
                />
                <div className="description-actions">
                  <button className="btn btn-sm btn-primary" onClick={handleSaveDescription}>
                    Save
                  </button>
                  <button 
                    className="btn btn-sm btn-secondary" 
                    onClick={() => {
                      setDescription(collection.description || '');
                      setIsEditingDescription(false);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p 
                className="collection-description"
                onClick={() => setIsEditingDescription(true)}
              >
                {collection.description || 'Click to add a description...'}
              </p>
            )}
            
            <div className="collection-stats">
              <span className="stat">{documents.length} items</span>
            </div>
          </div>
          
          <div className="collection-actions">
            <button 
              className="btn btn-primary"
              onClick={() => setShowAddItems(true)}
            >
              + Add Items
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => {
                // Edit collection - could open modal
              }}
            >
              Edit Collection
            </button>
            <button 
              className="btn btn-danger-outline"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete Collection
            </button>
          </div>
        </div>
      </div>

      {/* Filter Panel (same as Library) */}
      <div className="filter-section">
        <div className="filter-row">
          {/* Sort */}
          <div className="filter-group">
            <label>Sort</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="newest">Newest added</option>
              <option value="oldest">Oldest added</option>
              <option value="recently_opened">Recently opened</option>
              <option value="shortest">Shortest read</option>
              <option value="longest">Longest read</option>
              <option value="alpha_asc">Alphabetical (A-Z)</option>
              <option value="alpha_desc">Alphabetical (Z-A)</option>
            </select>
          </div>

          {/* Tags */}
          <div className="filter-group">
            <label>Tags</label>
            <select 
              multiple
              value={selectedTags}
              onChange={(e) => setSelectedTags(Array.from(e.target.selectedOptions, o => o.value))}
            >
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
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
            >
              {allDomains.map(domain => (
                <option key={domain} value={domain}>{domain}</option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="filter-group">
            <label>Date</label>
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
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
            <select value={readingTime} onChange={(e) => setReadingTime(e.target.value)}>
              <option value="all">Any</option>
              <option value="under3">Under 3 min</option>
              <option value="3to10">3-10 min</option>
              <option value="over10">10+ min</option>
            </select>
          </div>

          {/* Difficulty */}
          <div className="filter-group">
            <label>Difficulty</label>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              <option value="all">All</option>
              <option value="easy">Easy</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          {/* Status */}
          <div className="filter-group">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
              <option value="truncated">Truncated</option>
            </select>
          </div>

          {/* View Toggle */}
          <div className="filter-group view-toggle-group">
            <label>View</label>
            <div className="view-toggle">
              <button 
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                ⊞
              </button>
              <button 
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                ☰
              </button>
              <button 
                className={`view-btn ${viewMode === 'compact' ? 'active' : ''}`}
                onClick={() => setViewMode('compact')}
              >
                ≡
              </button>
            </div>
          </div>
        </div>

        {activeFiltersCount > 0 && (
          <button className="clear-filters-btn" onClick={clearFilters}>
            Clear all filters ({activeFiltersCount})
          </button>
        )}
      </div>

      {/* Results Count */}
      <div className="results-header">
        <span className="results-count">{filteredDocs.length} items</span>
      </div>

      {/* Documents Grid/List */}
      {isLoading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <span>Loading items...</span>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📄</div>
          <h3>No items in this collection</h3>
          <p>Add items from your library to this collection</p>
          <button className="btn btn-primary" onClick={() => setShowAddItems(true)}>
            Add Items
          </button>
        </div>
      ) : (
        <div className={`documents-${viewMode}`}>
          {filteredDocs.map((doc) => (
            <div 
              key={doc.id} 
              className="doc-card"
              onClick={() => navigate(`/app/content/${doc.id}`)}
            >
              {viewMode === 'grid' && (
                <>
                  <div className="doc-thumbnail">
                    {doc.og_image_url ? (
                      <img src={doc.og_image_url} alt="" />
                    ) : (
                      <span className="thumbnail-emoji">📄</span>
                    )}
                  </div>
                  <div className="doc-content">
                    <div className="doc-meta-row">
                      <span className="doc-domain">{doc.domain}</span>
                      <span className="doc-date">{formatDate(doc.created_at)}</span>
                    </div>
                    <h3 className="doc-title">{doc.title}</h3>
                    {doc.summary && (
                      <p className="doc-summary">{doc.summary}</p>
                    )}
                    <div className="doc-badges">
                      {doc.reading_time_minutes && (
                        <span className="reading-badge">📖 {doc.reading_time_minutes} min</span>
                      )}
                      {doc.is_truncated && (
                        <span className="status-badge truncated">⚠ Truncated</span>
                      )}
                    </div>
                  </div>
                  <button 
                    className="remove-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFromCollection(doc.id);
                    }}
                    title="Remove from collection"
                  >
                    ×
                  </button>
                </>
              )}

              {viewMode === 'list' && (
                <div className="doc-list-row">
                  <span className="list-favicon">{doc.favicon_url ? <img src={doc.favicon_url} alt="" /> : '📄'}</span>
                  <span className="list-title">{doc.title}</span>
                  <span className="list-domain">{doc.domain}</span>
                  <span className="list-date">{formatDate(doc.created_at)}</span>
                  <span className="list-time">{doc.reading_time_minutes || '-'} min</span>
                  <button 
                    className="remove-btn-small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFromCollection(doc.id);
                    }}
                  >
                    ×
                  </button>
                </div>
              )}

              {viewMode === 'compact' && (
                <div className="doc-compact-row">
                  <span className="compact-favicon">{doc.favicon_url ? <img src={doc.favicon_url} alt="" /> : '📄'}</span>
                  <span className="compact-title">{doc.title}</span>
                  <span className="compact-domain">{doc.domain}</span>
                  <span className="compact-date">{formatDate(doc.created_at)}</span>
                  <button 
                    className="remove-btn-small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFromCollection(doc.id);
                    }}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {hasNext && (
        <div className="pagination">
          <button 
            className="btn btn-secondary"
            onClick={() => setPage(p => p + 1)}
          >
            Load More
          </button>
        </div>
      )}

      {/* Add Items Modal */}
      <AddItemsModal
        isOpen={showAddItems}
        onClose={() => setShowAddItems(false)}
        collectionId={collection.id}
        onItemsAdded={fetchDocuments}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Collection</h2>
              <button className="close-btn" onClick={() => setShowDeleteConfirm(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete "{collection.name}"?</p>
              <p className="warning-text">This will remove all items from this collection, but won't delete the actual content.</p>
            </div>
            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger"
                onClick={handleDeleteCollection}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .collection-detail-page {
          max-width: 1400px;
          margin: 0 auto;
          padding: 1.5rem 2rem;
        }

        /* Collection Header */
        .collection-header {
          margin-bottom: 2rem;
        }

        .back-btn {
          background: none;
          border: none;
          color: #6366f1;
          font-size: 0.9rem;
          cursor: pointer;
          padding: 0;
          margin-bottom: 1rem;
        }

        .back-btn:hover {
          text-decoration: underline;
        }

        .collection-info {
          display: flex;
          gap: 1.5rem;
          align-items: flex-start;
        }

        .collection-icon-wrapper {
          width: 64px;
          height: 64px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .collection-icon {
          font-size: 2rem;
        }

        .collection-details {
          flex: 1;
        }

        .collection-details h1 {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.5rem;
        }

        .collection-description {
          color: #6b7280;
          margin: 0 0 0.5rem;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 6px;
          transition: background 0.2s;
        }

        .collection-description:hover {
          background: #f3f4f6;
        }

        .description-edit textarea {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
          resize: vertical;
        }

        .description-actions {
          display: flex;
          gap: 0.5rem;
        }

        .collection-stats {
          display: flex;
          gap: 1rem;
          font-size: 0.85rem;
          color: #6b7280;
        }

        .collection-actions {
          display: flex;
          gap: 0.75rem;
          flex-shrink: 0;
        }

        /* Filter Section */
        .filter-section {
          background: white;
          border-radius: 12px;
          padding: 1.25rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .filter-row {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          align-items: flex-end;
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

        .filter-group select {
          padding: 0.5rem;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 0.85rem;
          background: white;
          min-width: 120px;
        }

        .filter-group select[multiple] {
          height: 70px;
        }

        .view-toggle-group {
          flex-direction: row;
          align-items: flex-end;
        }

        .view-toggle {
          display: flex;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          overflow: hidden;
        }

        .view-btn {
          padding: 0.5rem 0.75rem;
          border: none;
          background: white;
          cursor: pointer;
          font-size: 1rem;
        }

        .view-btn.active {
          background: #6366f1;
          color: white;
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

        /* Results Header */
        .results-header {
          margin-bottom: 1rem;
        }

        .results-count {
          color: #6b7280;
          font-size: 0.9rem;
        }

        /* Loading State */
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 4rem;
          color: #6b7280;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e5e7eb;
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-state h3 {
          font-size: 1.25rem;
          color: #374151;
          margin: 0 0 0.5rem;
        }

        .empty-state p {
          color: #6b7280;
          margin: 0 0 1.5rem;
        }

        /* Documents Grid/List */
        .documents-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        @media (max-width: 1100px) {
          .documents-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 700px) {
          .documents-grid {
            grid-template-columns: 1fr;
          }
        }

        .documents-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .documents-compact {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        /* Document Card */
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

        .doc-card:hover .remove-btn,
        .doc-card:hover .remove-btn-small {
          opacity: 1;
        }

        .doc-thumbnail {
          height: 120px;
          background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .doc-thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .thumbnail-emoji {
          font-size: 3rem;
          opacity: 0.5;
        }

        .doc-content {
          padding: 1rem;
        }

        .doc-meta-row {
          display: flex;
          justify-content: space-between;
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
          margin: 0 0 0.5rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .doc-badges {
          display: flex;
          gap: 0.5rem;
        }

        .reading-badge,
        .status-badge {
          font-size: 0.7rem;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
        }

        .reading-badge {
          background: #f3f4f6;
          color: #6b7280;
        }

        .status-badge.truncated {
          background: #fef3c7;
          color: #d97706;
        }

        /* Remove Button */
        .remove-btn {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          width: 28px;
          height: 28px;
          border: none;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          font-size: 1.25rem;
          color: #6b7280;
          opacity: 0;
          transition: opacity 0.2s, background 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .remove-btn:hover {
          background: #fee2e2;
          color: #dc2626;
        }

        /* List View */
        .doc-list-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1rem;
        }

        .list-favicon {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .list-favicon img {
          width: 20px;
          height: 20px;
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

        .remove-btn-small {
          width: 24px;
          height: 24px;
          border: none;
          border-radius: 4px;
          background: transparent;
          cursor: pointer;
          font-size: 1rem;
          color: #9ca3af;
          opacity: 0;
          transition: opacity 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .remove-btn-small:hover {
          background: #fee2e2;
          color: #dc2626;
        }

        /* Compact View */
        .doc-compact-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 0.75rem;
        }

        .compact-favicon {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .compact-favicon img {
          width: 16px;
          height: 16px;
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

        /* Pagination */
        .pagination {
          text-align: center;
          padding: 2rem;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal {
          background: white;
          border-radius: 12px;
          width: 100%;
          max-width: 480px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-sm {
          max-width: 380px;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-header h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0;
        }

        .close-btn {
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 1.5rem;
          color: #6b7280;
          border-radius: 6px;
        }

        .close-btn:hover {
          background: #f3f4f6;
        }

        .modal-body {
          padding: 1.5rem;
        }

        .modal-body p {
          margin: 0 0 0.5rem;
        }

        .warning-text {
          font-size: 0.85rem;
          color: #6b7280;
        }

        .modal-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
          padding: 1rem 1.5rem;
          border-top: 1px solid #e5e7eb;
        }

        /* Add Items Modal */
        .add-items-modal {
          background: white;
          border-radius: 12px;
          width: 100%;
          max-width: 560px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
        }

        .search-section {
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #e5e7eb;
          position: relative;
        }

        .search-input {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 0.95rem;
        }

        .search-input:focus {
          outline: none;
          border-color: #6366f1;
        }

        .search-spinner {
          position: absolute;
          right: 2.5rem;
          top: 50%;
          transform: translateY(-50%);
          width: 20px;
          height: 20px;
          border: 2px solid #e5e7eb;
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .results-list {
          flex: 1;
          overflow-y: auto;
          padding: 0.5rem;
          max-height: 400px;
        }

        .no-results,
        .search-hint {
          text-align: center;
          padding: 2rem;
          color: #6b7280;
        }

        .result-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .result-item:hover {
          background: #f3f4f6;
        }

        .result-item.selected {
          background: #e0e7ff;
        }

        .result-checkbox input {
          width: 18px;
          height: 18px;
        }

        .result-favicon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .result-favicon img {
          width: 24px;
          height: 24px;
          border-radius: 4px;
        }

        .result-content {
          flex: 1;
          min-width: 0;
        }

        .result-title {
          font-size: 0.9rem;
          font-weight: 500;
          color: #1f2937;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .result-domain {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .modal-footer {
          padding: 1rem 1.5rem;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .selected-count {
          font-size: 0.9rem;
          color: #6b7280;
        }

        .footer-actions {
          display: flex;
          gap: 0.75rem;
        }

        /* Buttons */
        .btn {
          padding: 0.625rem 1.25rem;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
          border: none;
        }

        .btn-sm {
          padding: 0.375rem 0.75rem;
          font-size: 0.85rem;
        }

        .btn-primary {
          background: #6366f1;
          color: white;
        }

        .btn-primary:hover {
          background: #4f46e5;
        }

        .btn-primary:disabled {
          background: #a5b4fc;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #f3f4f6;
          color: #374151;
        }

        .btn-secondary:hover {
          background: #e5e7eb;
        }

        .btn-danger {
          background: #dc2626;
          color: white;
        }

        .btn-danger:hover {
          background: #b91c1c;
        }

        .btn-danger-outline {
          background: transparent;
          color: #dc2626;
          border: 1px solid #dc2626;
        }

        .btn-danger-outline:hover {
          background: #fee2e2;
        }
      `}</style>
    </div>
  );
}

export default CollectionDetailPage;
