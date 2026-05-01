import { useState, useEffect } from 'react';
import { annotationAPI, collectionAPI } from '../services/api';

// Color configuration for annotations
const COLORS = [
  { id: 'yellow', label: 'Yellow', hex: '#fef08a' },
  { id: 'green', label: 'Green', hex: '#bbf7d0' },
  { id: 'pink', label: 'Pink', hex: '#fbcfe8' },
  { id: 'blue', label: 'Blue', hex: '#bfdbfe' },
];

// Annotation Card Component
function AnnotationCard({ annotation, onNavigate }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getColorStyle = (color) => {
    const colorConfig = COLORS.find(c => c.id === color);
    return colorConfig ? colorConfig.hex : '#fef08a';
  };

  return (
    <div className="annotation-card">
      {/* Color indicator dot */}
      <div 
        className="color-indicator" 
        style={{ backgroundColor: getColorStyle(annotation.color) }}
        title={`${annotation.color} highlight`}
      />

      {/* Highlighted text in blockquote */}
      <blockquote className="highlighted-text">
        &ldquo;{annotation.selected_text}&rdquo;
      </blockquote>

      {/* User's note */}
      {annotation.note && (
        <div className="annotation-note">
          <span className="note-label">Note:</span> {annotation.note}
        </div>
      )}

      {/* Source info */}
      <div className="source-info">
        <span className="from-label">From:</span>
        {annotation.content_favicon_url ? (
          <img 
            src={annotation.content_favicon_url} 
            alt="" 
            className="source-favicon"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <span className="source-favicon-placeholder">📄</span>
        )}
        <button 
          className="source-title"
          onClick={() => onNavigate && onNavigate(annotation.content_id)}
        >
          {annotation.content_title}
        </button>
        <span className="source-domain">{annotation.content_domain}</span>
      </div>

      {/* Tags from parent document */}
      {annotation.content_tags && annotation.content_tags.length > 0 && (
        <div className="annotation-tags">
          {annotation.content_tags.slice(0, 5).map((tag, idx) => (
            <span key={idx} className="tag">{tag}</span>
          ))}
        </div>
      )}

      {/* Date */}
      <div className="annotation-date">
        {formatDate(annotation.created_at)}
      </div>
    </div>
  );
}

// Main AnnotationsPage Component
function AnnotationsPage({ onNavigate }) {
  // State
  const [annotations, setAnnotations] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Filter states
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedCollection, setSelectedCollection] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [domain, setDomain] = useState('');
  
  // Sort state
  const [sortBy, setSortBy] = useState('newest');
  
  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 20;
  
  // Collections for filter
  const [collections, setCollections] = useState([]);
  
  // Available domains and tags (extracted from annotations)
  const [availableDomains, setAvailableDomains] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);

  // Load collections on mount
  useEffect(() => {
    loadCollections();
  }, []);

  // Load annotations when filters change
  useEffect(() => {
    loadAnnotations();
  }, [selectedColor, selectedCollection, selectedTag, dateRange, domain, sortBy, page]);

  const loadCollections = async () => {
    try {
      const response = await collectionAPI.getAll(true, 'name');
      setCollections(response.data.collections || []);
    } catch (err) {
      console.error('Failed to load collections:', err);
    }
  };

  const loadAnnotations = async () => {
    setIsLoading(true);
    
    try {
      const params = {
        page,
        page_size: pageSize,
        sort: sortBy,
      };
      
      if (selectedColor) params.color = selectedColor;
      if (selectedCollection) params.collection_id = selectedCollection;
      if (selectedTag) params.content_tags = selectedTag;
      if (domain) params.domain = domain;
      if (dateRange !== 'all') {
        const dateFrom = getDateFromRange(dateRange);
        if (dateFrom) params.date_from = dateFrom;
      }
      
      const response = await annotationAPI.list(params);
      
      setAnnotations(response.data.annotations || []);
      setTotal(response.data.total || 0);
      
      // Extract unique domains and tags from results for filter dropdowns
      extractFilters(response.data.annotations || []);
    } catch (err) {
      console.error('Failed to load annotations:', err);
      setAnnotations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const extractFilters = (annotationList) => {
    // Extract unique domains
    const domains = [...new Set(annotationList.map(a => a.content_domain).filter(Boolean))];
    setAvailableDomains(domains);
    
    // Extract unique tags
    const allTags = annotationList.flatMap(a => a.content_tags || []);
    const uniqueTags = [...new Set(allTags)];
    setAvailableTags(uniqueTags);
  };

  const getDateFromRange = (range) => {
    const now = new Date();
    let date;
    switch (range) {
      case 'today':
        date = now;
        break;
      case 'week':
        date = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        date = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case '3months':
        date = new Date(now.setMonth(now.getMonth() - 3));
        break;
      case 'year':
        date = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        date = null;
    }
    return date ? date.toISOString().split('T')[0] : null;
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await annotationAPI.export('markdown');
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `smartkeep-annotations-${new Date().toISOString().split('T')[0]}.md`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export annotations:', err);
      alert('Failed to export annotations. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const clearFilters = () => {
    setSelectedColor('');
    setSelectedCollection('');
    setSelectedTag('');
    setDateRange('all');
    setDomain('');
    setPage(1);
  };

  const activeFiltersCount = 
    (selectedColor ? 1 : 0) +
    (selectedCollection ? 1 : 0) +
    (selectedTag ? 1 : 0) +
    (dateRange !== 'all' ? 1 : 0) +
    (domain ? 1 : 0);

  const totalPages = Math.ceil(total / pageSize);

  const handleNavigateToContent = (contentId) => {
    if (onNavigate) {
      onNavigate('content-detail', { id: contentId });
    }
  };

  return (
    <div className="annotations-page">
      {/* Header */}
      <div className="annotations-header">
        <div className="header-title">
          <h1>Annotations</h1>
          <span className="annotation-count">{total} total annotations</span>
        </div>
        <button 
          className="export-btn"
          onClick={handleExport}
          disabled={isExporting || total === 0}
        >
          {isExporting ? '⏳ Exporting...' : '📥 Export All'}
        </button>
      </div>

      {/* Filters Bar */}
      <div className="filters-bar">
        <div className="filters-left">
          {/* Color Filter */}
          <select 
            value={selectedColor}
            onChange={(e) => { setSelectedColor(e.target.value); setPage(1); }}
            className="filter-select"
          >
            <option value="">All Colors</option>
            {COLORS.map(color => (
              <option key={color.id} value={color.id}>
                {color.label}
              </option>
            ))}
          </select>

          {/* Collection Filter */}
          <select 
            value={selectedCollection}
            onChange={(e) => { setSelectedCollection(e.target.value); setPage(1); }}
            className="filter-select"
          >
            <option value="">All Collections</option>
            {collections.map(col => (
              <option key={col.id} value={col.id}>
                {col.icon} {col.name}
              </option>
            ))}
          </select>

          {/* Tag Filter */}
          <select 
            value={selectedTag}
            onChange={(e) => { setSelectedTag(e.target.value); setPage(1); }}
            className="filter-select"
          >
            <option value="">All Tags</option>
            {availableTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>

          {/* Domain Filter */}
          <select 
            value={domain}
            onChange={(e) => { setDomain(e.target.value); setPage(1); }}
            className="filter-select"
          >
            <option value="">All Domains</option>
            {availableDomains.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Date Range Filter */}
          <select 
            value={dateRange}
            onChange={(e) => { setDateRange(e.target.value); setPage(1); }}
            className="filter-select"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="3months">Last 3 Months</option>
            <option value="year">Last Year</option>
          </select>

          {activeFiltersCount > 0 && (
            <button className="clear-filters-btn" onClick={clearFilters}>
              Clear ({activeFiltersCount})
            </button>
          )}
        </div>

        <div className="filters-right">
          {/* Sort */}
          <select 
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
            className="filter-select sort-select"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="source_title">Source Title</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <span>Loading annotations...</span>
        </div>
      )}

      {/* Annotations List */}
      {!isLoading && annotations.length > 0 && (
        <div className="annotations-list">
          {annotations.map((annotation) => (
            <AnnotationCard 
              key={annotation.id} 
              annotation={annotation}
              onNavigate={handleNavigateToContent}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && annotations.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h3>No annotations yet</h3>
          <p>Start highlighting text in your saved documents to see them here.</p>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="pagination">
          <button 
            className="page-btn"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            ← Previous
          </button>
          <span className="page-info">
            Page {page} of {totalPages}
          </span>
          <button 
            className="page-btn"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next →
          </button>
        </div>
      )}

      <style>{`
        .annotations-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        /* Header */
        .annotations-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .header-title {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .header-title h1 {
          margin: 0;
          font-family: var(--font-serif);
          font-size: 3.5rem;
          color: #fff;
          letter-spacing: -0.04em;
          line-height: 1;
        }

        .annotation-count {
          font-family: var(--font-mono);
          font-size: 13px;
          color: var(--accent-color);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .export-btn {
          padding: 12px 24px;
          background: transparent;
          color: var(--text-color);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 99px;
          font-family: var(--font-sans);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .export-btn:hover:not(:disabled) {
          background: rgba(255,255,255,0.05);
          color: #fff;
        }

        .export-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* Filters Bar */
        .filters-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 16px;
          margin-bottom: 32px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .filters-left, .filters-right {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: center;
        }

        .filter-select {
          padding: 8px 16px;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          font-family: var(--font-sans);
          font-size: 13px;
          background: var(--bg-secondary);
          color: #fff;
          cursor: pointer;
          min-width: 140px;
        }

        .filter-select:focus {
          outline: none;
          border-color: var(--accent-color);
        }

        .sort-select {
          min-width: 160px;
        }

        .clear-filters-btn {
          padding: 8px 16px;
          background: rgba(240, 112, 112, 0.1);
          border: 1px solid rgba(240, 112, 112, 0.2);
          border-radius: 8px;
          font-size: 13px;
          color: #f07070;
          cursor: pointer;
          transition: all 0.2s;
        }

        .clear-filters-btn:hover {
          background: rgba(240, 112, 112, 0.15);
        }

        /* Loading State */
        .loading-state, .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 80px 32px;
          gap: 16px;
          color: var(--text-secondary);
          background: rgba(255,255,255,0.01);
          border: 1px dashed rgba(255,255,255,0.1);
          border-radius: 24px;
        }

        .empty-icon { font-size: 48px; opacity: 0.5; margin-bottom: 16px;}
        .empty-state h3 { font-family: var(--font-serif); font-size: 24px; color: #fff; }
        .empty-state p { font-size: 15px; color: var(--text-secondary); }

        /* Annotations List */
        .annotations-list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 24px;
        }

        /* Annotation Card */
        .annotation-card {
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          padding: 24px 24px 24px 48px;
          position: relative;
          transition: all 0.3s ease;
        }

        .annotation-card:hover {
          background: rgba(255,255,255,0.03);
          border-color: rgba(255,255,255,0.1);
          transform: translateY(-2px);
        }

        .color-indicator {
          position: absolute;
          left: 20px;
          top: 30px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          box-shadow: 0 0 10px currentColor;
        }

        .highlighted-text {
          margin: 0 0 16px;
          padding-left: 16px;
          border-left: 2px solid rgba(255,255,255,0.1);
          font-family: var(--font-serif);
          font-size: 18px;
          color: #fff;
          line-height: 1.6;
          font-style: italic;
        }

        .annotation-note {
          margin-bottom: 20px;
          font-size: 14px;
          color: #cbd5e1;
          line-height: 1.6;
          padding: 12px;
          background: rgba(0,0,0,0.2);
          border-radius: 8px;
        }

        .note-label {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--accent-color);
          text-transform: uppercase;
          margin-right: 8px;
          letter-spacing: 0.05em;
        }

        .source-info {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }

        .from-label {
          font-family: var(--font-mono);
          color: var(--text-secondary);
          font-size: 10px;
          text-transform: uppercase;
        }

        .source-title {
          background: none;
          border: none;
          padding: 0;
          color: var(--accent-color);
          font-size: 14px;
          cursor: pointer;
          font-family: var(--font-sans);
          font-weight: 500;
          transition: 0.2s;
        }

        .source-title:hover {
          color: #fff;
        }

        .source-domain {
          color: var(--text-secondary);
          font-size: 12px;
        }

        .annotation-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 16px;
        }

        .annotation-tags .tag {
          font-family: var(--font-mono);
          font-size: 11px;
          padding: 4px 8px;
          background: rgba(255,255,255,0.05);
          color: var(--text-secondary);
          border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.05);
        }

        .annotation-date {
          font-family: var(--font-mono);
          font-size: 11px;
          color: rgba(255,255,255,0.2);
          text-align: right;
        }

        /* Pagination */
        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 24px;
          margin-top: 48px;
        }

        .page-btn {
          padding: 10px 20px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 99px;
          font-size: 13px;
          color: #fff;
          cursor: pointer;
          transition: all 0.2s;
        }

        .page-btn:hover:not(:disabled) {
          background: rgba(255,255,255,0.1);
        }

        .page-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .page-info {
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--text-secondary);
        }

        /* Spinner */
        .spinner {
          width: 32px;
          height: 32px;
          border: 2px solid rgba(255,255,255,0.1);
          border-top-color: var(--accent-color);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .annotations-page { padding: 16px; }
          .annotations-list { grid-template-columns: 1fr; }
          .header-title h1 { font-size: 2.5rem; }

          .filters-bar {
            flex-direction: column;
            align-items: stretch;
          }

          .filters-left, .filters-right {
            justify-content: flex-start;
          }

          .filter-select {
            flex: 1;
            min-width: auto;
          }
        }
      `}</style>
    </div>
  );
}

export default AnnotationsPage;
