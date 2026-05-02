import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Grid, List as ListIcon, Filter, Book, ExternalLink, 
  Trash2, Check, Download, FolderPlus, ChevronLeft, 
  ChevronRight, MoreVertical, CheckCircle2, Clock, 
  BarChart3, Hash
} from 'lucide-react';
import { contentAPI, collectionAPI } from '../services/api';
import './Library.css';

function Library({
  documents: initialDocuments = [],
  collections = [],
  tags: initialTags = [],
  onSelectDocument,
  onAddToCollection,
  onDeleteDocument,
  onRefresh,
  isUncollectedView = false,
  collectionId = null
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // View & Pagination state
  const [viewMode, setViewMode] = useState('grid');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [docs, setDocs] = useState([]);

  // Filter state
  const [filters, setFilters] = useState({
    tag: 'all',
    domain: 'all',
    status: 'all',
    difficulty: 'all',
    sort: 'newest'
  });

  // Selection state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  // Derived data for filters
  const [availableDomains, setAvailableDomains] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);

  const fetchDocs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        page,
        page_size: pageSize,
        sort: filters.sort,
        ...(filters.tag !== 'all' && { tags: filters.tag }),
        ...(filters.domain !== 'all' && { domain: filters.domain }),
        ...(filters.status === 'read' && { is_read: true }),
        ...(filters.status === 'unread' && { is_read: false }),
        ...(filters.difficulty !== 'all' && { difficulty: filters.difficulty })
      };

      let response;
      if (isUncollectedView) {
        response = await collectionAPI.getUncollectedContent(params);
      } else if (collectionId) {
        response = await collectionAPI.getContent(collectionId, params);
      } else {
        response = await contentAPI.getList(params);
      }

      setDocs(response.data.items || []);
      setTotalItems(response.data.total || 0);
      setHasNext(response.data.has_next || false);
      
      // Update filter options from the fetched items
      if (response.data.items) {
          // Extract unique tags from the documents
          const allTags = new Set();
          response.data.items.forEach(doc => {
            if (doc.tags && Array.isArray(doc.tags)) {
              doc.tags.forEach(tag => allTags.add(tag));
            }
          });
          setAvailableTags(Array.from(allTags).sort());
          
          // Extract unique domains
          const domains = [...new Set(response.data.items.map(d => d.domain).filter(Boolean))];
          setAvailableDomains(domains);
      }
    } catch (err) {
      console.error('Failed to fetch library documents:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, filters, isUncollectedView, collectionId]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  // Sync with URL tag param
  useEffect(() => {
    const urlTag = searchParams.get('tag');
    if (urlTag && urlTag !== filters.tag) {
      setFilters(prev => ({ ...prev, tag: urlTag }));
      setPage(1);
    }
  }, [searchParams]);

  // Handlers
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page on filter change
    setSelectedIds(new Set()); // Clear selection
  };

  const toggleSelect = (id, e) => {
    if (e) e.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === docs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(docs.map(d => d.id)));
    }
  };

  // Bulk Actions
  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} items?`)) return;
    setIsBulkLoading(true);
    try {
      await contentAPI.bulkDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
      fetchDocs();
      onRefresh && onRefresh();
    } catch (err) {
      console.error('Bulk delete failed:', err);
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleBulkMarkRead = async (isRead) => {
    setIsBulkLoading(true);
    try {
      await contentAPI.bulkMarkRead(Array.from(selectedIds), isRead);
      setSelectedIds(new Set());
      fetchDocs();
      onRefresh && onRefresh();
    } catch (err) {
      console.error('Bulk mark read failed:', err);
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleBulkExport = async () => {
    setIsBulkLoading(true);
    try {
      const response = await contentAPI.bulkExport(Array.from(selectedIds));
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smartkeep_export_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Bulk export failed:', err);
    } finally {
      setIsBulkLoading(false);
    }
  };

  return (
    <div className="library-container">
      {/* Sidebar Filters */}
      <aside className="filter-sidebar">
        <div className="filter-section">
          <h3>Sort By</h3>
          <select 
            className="sleek-select" 
            value={filters.sort}
            onChange={(e) => handleFilterChange('sort', e.target.value)}
          >
            <option value="newest">Recently Saved</option>
            <option value="oldest">Oldest Saved</option>
            <option value="date_read">Recently Read</option>
            <option value="alpha_asc">Title (A-Z)</option>
            <option value="reading_time_asc">Shortest Read</option>
            <option value="reading_time_desc">Longest Read</option>
          </select>
        </div>

        <div className="filter-section">
          <h3>Status</h3>
          <div className="tag-cloud-filter">
            <button 
              className={`tag-filter-chip ${filters.status === 'all' ? 'active' : ''}`}
              onClick={() => handleFilterChange('status', 'all')}
            >All</button>
            <button 
              className={`tag-filter-chip ${filters.status === 'unread' ? 'active' : ''}`}
              onClick={() => handleFilterChange('status', 'unread')}
            >Unread</button>
            <button 
              className={`tag-filter-chip ${filters.status === 'read' ? 'active' : ''}`}
              onClick={() => handleFilterChange('status', 'read')}
            >Read</button>
          </div>
        </div>

        <div className="filter-section">
          <h3>Tags</h3>
          <div className="tag-cloud-filter">
            <button 
                className={`tag-filter-chip ${filters.tag === 'all' ? 'active' : ''}`}
                onClick={() => handleFilterChange('tag', 'all')}
            >All Tags</button>
            {availableTags.slice(0, 15).map(tag => (
              <button 
                key={tag}
                className={`tag-filter-chip ${filters.tag === tag ? 'active' : ''}`}
                onClick={() => handleFilterChange('tag', tag)}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <h3>Difficulty</h3>
          <select 
            className="sleek-select"
            value={filters.difficulty}
            onChange={(e) => handleFilterChange('difficulty', e.target.value)}
          >
            <option value="all">Any Difficulty</option>
            <option value="easy">Easy</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        <div className="filter-section">
            <h3>Domain</h3>
            <select 
                className="sleek-select"
                value={filters.domain}
                onChange={(e) => handleFilterChange('domain', e.target.value)}
            >
                <option value="all">All Domains</option>
                {availableDomains.map(d => (
                    <option key={d} value={d}>{d}</option>
                ))}
            </select>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="library-main" style={{ flex: 1 }}>
        <header className="library-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                {isUncollectedView ? 'Inbox' : collectionId ? 'Collection' : 'Your Library'}
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>{totalItems} items found in your knowledge base</p>
          </div>
          <div className="view-toggles">
            <button 
                className={`icon-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
            ><Grid size={18} /></button>
            <button 
                className={`icon-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
            ><ListIcon size={18} /></button>
          </div>
        </header>

        {isLoading ? (
          <div className="loading-state" style={{ padding: '4rem', textAlign: 'center' }}>
            <div className="spinner"></div>
            <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Loading documents...</p>
          </div>
        ) : docs.length === 0 ? (
          <div className="empty-state sleek-panel">
            <div className="empty-icon"><Book size={48} /></div>
            <h3>No items found</h3>
            <p>Try clearing your filters or adding new content.</p>
            {(filters.tag !== 'all' || filters.status !== 'all' || filters.domain !== 'all') && (
                <button 
                    className="btn btn-secondary" 
                    style={{ marginTop: '1rem' }}
                    onClick={() => {
                        setFilters({ tag: 'all', domain: 'all', status: 'all', difficulty: 'all', sort: 'newest' });
                        setSearchParams({});
                        setPage(1);
                        setSelectedIds(new Set());
                    }}
                >Clear Filters</button>
            )}
          </div>
        ) : (
          <div className={`library-grid ${viewMode}`}>
            {docs.map(doc => (
              <div 
                key={doc.id} 
                className={`sleek-doc-card ${selectedIds.has(doc.id) ? 'selected' : ''}`}
                onClick={() => onSelectDocument && onSelectDocument(doc)}
              >
                <div 
                  className="selection-checkbox" 
                  onClick={(e) => toggleSelect(doc.id, e)}
                >
                  <Check size={12} strokeWidth={3} />
                </div>

                <div className="doc-topbar">
                  <span className="doc-domain">{doc.domain}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {doc.is_read && <CheckCircle2 size={14} className="status-icon read" style={{ color: '#10b981' }} />}
                    <span className="doc-date">{new Date(doc.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <h3 className="doc-title">{doc.title}</h3>
                
                {viewMode === 'grid' && (
                  <p className="doc-preview">
                    {doc.summary || 'Indexing and analyzing content...'}
                  </p>
                )}

                 <div className="doc-bottombar">
                   <div className="tag-list">
                     {doc.tags?.slice(0, 2).map((tag, idx) => (
                       <span 
                         key={idx} 
                         className="mono-tag amber clickable" 
                         onClick={(e) => {
                             e.stopPropagation();
                             handleFilterChange('tag', tag);
                         }}
                       >#{tag}</span>
                     ))}
                     {doc.tags?.length > 2 && <span className="mono-tag gray">+{doc.tags.length - 2}</span>}
                   </div>
                   <div className="doc-meta-icons" style={{ display: 'flex', gap: '12px', color: 'var(--text-secondary)' }}>
                     {doc.reading_time_minutes > 0 && (
                         <div title="Reading time" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                             <Clock size={12} /> {doc.reading_time_minutes}m
                         </div>
                     )}
                     {doc.difficulty && (
                         <div title="Complexity" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                             <BarChart3 size={12} /> {doc.difficulty}
                         </div>
                     )}
                   </div>
                   <div className="doc-actions" style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
                     <button 
                       className="add-to-collection-btn"
                       onClick={(e) => {
                         e.stopPropagation();
                         onAddToCollection && onAddToCollection(doc.id);
                       }}
                     >
                       <FolderPlus size={14} />
                       <span>Add to collection</span>
                     </button>
                   </div>
                 </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {!isLoading && totalItems > pageSize && (
            <div className="pagination-container">
                <button 
                    className="page-btn" 
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                ><ChevronLeft size={20} /></button>
                <span className="page-info">Page {page} of {Math.ceil(totalItems / pageSize)}</span>
                <button 
                    className="page-btn"
                    disabled={!hasNext}
                    onClick={() => setPage(p => p + 1)}
                ><ChevronRight size={20} /></button>
            </div>
        )}
      </main>

      {/* Bulk Action Toolbar */}
      {selectedIds.size > 0 && (
        <div className="bulk-toolbar">
          <div className="bulk-info">
            {selectedIds.size} items selected
          </div>
          <div className="bulk-actions">
            <button className="bulk-btn" onClick={() => handleBulkMarkRead(true)}>
              <CheckCircle2 size={16} /> Mark Read
            </button>
            <button className="bulk-btn" onClick={() => handleBulkMarkRead(false)}>
              Mark Unread
            </button>
            <button className="bulk-btn" onClick={handleBulkExport}>
              <Download size={16} /> Export
            </button>
            <button className="bulk-btn danger" onClick={handleBulkDelete}>
              <Trash2 size={16} /> Delete
            </button>
            <button className="bulk-btn" onClick={() => setSelectedIds(new Set())}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Library;
