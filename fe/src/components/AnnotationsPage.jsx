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
        "{annotation.selected_text}"
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
          max-width: 100%;
          padding: 1.5rem;
        }

        /* Header */
        .annotations-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .header-title {
          display: flex;
          align-items: baseline;
          gap: 1rem;
        }

        .header-title h1 {
          margin: 0;
          font-size: 1.75rem;
          color: #1f2937;
        }

        .annotation-count {
          font-size: 0.9rem;
          color: #6b7280;
        }

        .export-btn {
          padding: 0.6rem 1.25rem;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .export-btn:hover:not(:disabled) {
          background: #059669;
        }

        .export-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        /* Filters Bar */
        .filters-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: white;
          border-radius: 12px;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 0.75rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .filters-left, .filters-right {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          align-items: center;
        }

        .filter-select {
          padding: 0.5rem 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 0.85rem;
          background: white;
          cursor: pointer;
          min-width: 120px;
        }

        .filter-select:focus {
          outline: none;
          border-color: #667eea;
        }

        .sort-select {
          min-width: 150px;
        }

        .clear-filters-btn {
          padding: 0.5rem 0.75rem;
          background: #f3f4f6;
          border: none;
          border-radius: 8px;
          font-size: 0.8rem;
          color: #6b7280;
          cursor: pointer;
          transition: background 0.2s;
        }

        .clear-filters-btn:hover {
          background: #e5e7eb;
        }

        /* Loading State */
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 4rem 2rem;
          gap: 1rem;
          color: #6b7280;
        }

        /* Annotations List */
        .annotations-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        /* Annotation Card */
        .annotation-card {
          background: white;
          border-radius: 12px;
          padding: 1.25rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          position: relative;
          padding-left: 3rem;
          transition: box-shadow 0.2s;
        }

        .annotation-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .color-indicator {
          position: absolute;
          left: 1rem;
          top: 1.25rem;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .highlighted-text {
          margin: 0 0 0.75rem;
          padding: 0.75rem 1rem;
          background: #f9fafb;
          border-left: 3px solid #667eea;
          border-radius: 0 8px 8px 0;
          font-size: 0.95rem;
          color: #374151;
          line-height: 1.6;
          font-style: italic;
        }

        .annotation-note {
          margin-bottom: 0.75rem;
          font-size: 0.9rem;
          color: #4b5563;
          line-height: 1.5;
        }

        .note-label {
          font-weight: 600;
          color: #6b7280;
        }

        .source-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          margin-bottom: 0.5rem;
          flex-wrap: wrap;
        }

        .from-label {
          color: #9ca3af;
          font-weight: 500;
        }

        .source-favicon {
          width: 16px;
          height: 16px;
          border-radius: 2px;
        }

        .source-favicon-placeholder {
          font-size: 0.9rem;
        }

        .source-title {
          background: none;
          border: none;
          padding: 0;
          color: #667eea;
          font-size: 0.85rem;
          cursor: pointer;
          text-decoration: none;
          font-weight: 500;
        }

        .source-title:hover {
          text-decoration: underline;
        }

        .source-domain {
          color: #9ca3af;
          font-size: 0.8rem;
        }

        .annotation-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
          margin-bottom: 0.5rem;
        }

        .annotation-tags .tag {
          font-size: 0.7rem;
          padding: 0.2rem 0.5rem;
          background: #e0e7ff;
          color: #667eea;
          border-radius: 12px;
        }

        .annotation-date {
          font-size: 0.8rem;
          color: #9ca3af;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          background: white;
          border-radius: 12px;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .empty-state h3 {
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .empty-state p {
          color: #6b7280;
          max-width: 400px;
          margin: 0 auto;
        }

        /* Pagination */
        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          margin-top: 2rem;
          padding: 1rem;
        }

        .page-btn {
          padding: 0.5rem 1rem;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 0.85rem;
          color: #374151;
          cursor: pointer;
          transition: all 0.2s;
        }

        .page-btn:hover:not(:disabled) {
          background: #f9fafb;
          border-color: #667eea;
          color: #667eea;
        }

        .page-btn:disabled {
          background: #f3f4f6;
          color: #9ca3af;
          cursor: not-allowed;
        }

        .page-info {
          font-size: 0.85rem;
          color: #6b7280;
        }

        /* Dark mode support */
        .app.dark-mode .header-title h1 {
          color: #f3f4f6;
        }

        .app.dark-mode .annotation-count,
        .app.dark-mode .note-label,
        .app.dark-mode .from-label,
        .app.dark-mode .source-domain,
        .app.dark-mode .annotation-date,
        .app.dark-mode .page-info {
          color: #9ca3af;
        }

        .app.dark-mode .highlighted-text {
          background: #374151;
          color: #e5e7eb;
        }

        .app.dark-mode .annotation-note {
          color: #d1d5db;
        }

        .app.dark-mode .source-title {
          color: #a5b4fc;
        }

        .app.dark-mode .annotation-tags .tag {
          background: #4f46e5;
          color: #e0e7ff;
        }

        .app.dark-mode .filters-bar,
        .app.dark-mode .annotation-card,
        .app.dark-mode .empty-state,
        .app.dark-mode .page-btn {
          background: #1f2937;
          border-color: #374151;
        }

        .app.dark-mode .filter-select {
          background: #374151;
          border-color: #4b5563;
          color: #f3f4f6;
        }

        .app.dark-mode .clear-filters-btn {
          background: #374151;
          color: #9ca3af;
        }

        .app.dark-mode .clear-filters-btn:hover {
          background: #4b5563;
        }

        /* Spinner */
        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e5e7eb;
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .annotations-page {
            padding: 1rem;
          }

          .annotations-header {
            flex-direction: column;
            align-items: flex-start;
          }

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
