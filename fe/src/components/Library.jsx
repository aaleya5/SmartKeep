import { useState, useMemo } from 'react';
import { Grid, List, Filter } from 'lucide-react';

function Library({
  documents = [],
  collections = [],
  tags = [],
  onSelectDocument,
  onAddToCollection,
  onRefresh
}) {
  const [viewMode, setViewMode] = useState('grid');
  const [filterTag, setFilterTag] = useState('all');

  const allTags = useMemo(() => {
    return [...new Set(documents.flatMap(d => d.tags || []))].filter(Boolean);
  }, [documents]);

  const filteredDocs = useMemo(() => {
    if (filterTag === 'all') return documents;
    return documents.filter(d => d.tags?.includes(filterTag));
  }, [documents, filterTag]);

  return (
    <div className="library-sleek">
      <div className="library-header">
        <div className="header-titles">
          <h2>Your Knowledge Base</h2>
          <p className="subtitle">Explore and manage your indexed documents.</p>
        </div>
        <div className="library-stats">
          <span className="count-badge">{filteredDocs.length} Documents</span>
        </div>
      </div>

      <div className="library-controls glass-panel">
        <div className="view-toggles">
          <button 
            className={`icon-btn ${viewMode === 'grid' ? 'active' : ''}`} 
            onClick={() => setViewMode('grid')}
            title="Grid View"
          >
            <Grid size={18} />
          </button>
          <button 
            className={`icon-btn ${viewMode === 'list' ? 'active' : ''}`} 
            onClick={() => setViewMode('list')}
            title="List View"
          >
            <List size={18} />
          </button>
        </div>
        
        <div className="filter-group">
          <Filter size={16} className="filter-icon" />
          <select 
            className="sleek-select"
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
          >
            <option value="all">All Tags</option>
            {allTags.map(tag => (
              <option key={tag} value={tag}>#{tag}</option>
            ))}
          </select>
        </div>
      </div>

      {filteredDocs.length === 0 ? (
        <div className="empty-state sleek-panel">
          <div className="empty-icon"><Book size={48} /></div>
          <h3>No Documents Found</h3>
          <p>Try adjusting your search filters or add new content.</p>
        </div>
      ) : (
        <div className={`library-grid ${viewMode}`}>
          {filteredDocs.map(doc => (
            <div 
              key={doc.id} 
              className="sleek-doc-card"
              onClick={() => onSelectDocument && onSelectDocument(doc)}
            >
              <div className="doc-topbar">
                <span className="doc-domain">{doc.domain}</span>
                {doc.difficulty_score && (
                  <span className="doc-score">
                    Complexity: {doc.difficulty_score}/100
                  </span>
                )}
              </div>
              
              <h3 className="doc-title">{doc.title}</h3>
              {viewMode === 'grid' && (
                <p className="doc-preview">{doc.summary || "Content extracted and indexed. Semantic analysis active."}</p>
              )}
              
              <div className="doc-bottombar">
                <div className="tag-list">
                  {doc.tags?.slice(0, 3).map((tag, idx) => (
                    <span key={idx} className="mono-tag amber">#{tag}</span>
                  ))}
                </div>
                <div className="doc-actions">
                  <button 
                    className="action-btn" 
                    onClick={(e) => { e.stopPropagation(); onAddToCollection && onAddToCollection(doc.id); }}
                    title="Add to Collection"
                  >
                    + Add
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .library-sleek {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .library-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          padding-bottom: 24px;
          border-bottom: 1px solid var(--border-color);
        }

        .header-titles h2 {
          margin-bottom: 8px;
          font-size: 2.5rem;
        }

        .header-titles .subtitle {
          margin-bottom: 0;
          color: var(--text-secondary);
        }

        .count-badge {
          font-family: var(--font-mono);
          font-weight: 500;
          font-size: 13px;
          background: rgba(245, 200, 66, 0.1);
          color: var(--accent-color);
          padding: 6px 16px;
          border-radius: 99px;
          border: 1px solid rgba(245, 200, 66, 0.2);
        }

        .library-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
        }

        .view-toggles { 
          display: flex; 
          gap: 8px; 
          background: rgba(255, 255, 255, 0.05);
          padding: 4px;
          border-radius: 8px;
        }

        .icon-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          padding: 8px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .icon-btn:hover { 
          color: var(--text-color); 
          background: rgba(255, 255, 255, 0.05);
        }

        .icon-btn.active {
          background: var(--bg-secondary);
          color: var(--text-color);
          box-shadow: var(--shadow-sm);
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .filter-icon {
          color: var(--text-secondary);
        }

        .sleek-select {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          color: var(--text-color);
          padding: 8px 16px;
          border-radius: 8px;
          font-family: var(--font-sans);
          font-weight: 500;
          font-size: 14px;
          cursor: pointer;
          outline: none;
          min-width: 150px;
          transition: all 0.2s;
        }

        .sleek-select:focus { 
          border-color: var(--accent-color);
          box-shadow: 0 0 0 2px rgba(245, 200, 66, 0.1); 
        }
        
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 24px;
          text-align: center;
        }
        
        .empty-icon {
          color: var(--text-secondary);
          opacity: 0.5;
          margin-bottom: 24px;
        }

        .library-grid.grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 24px;
        }

        .library-grid.list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .sleek-doc-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-lg);
          padding: 24px;
          transition: all 0.2s ease;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }
        
        .sleek-doc-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 100%;
          background: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%);
          opacity: 0;
          transition: opacity 0.2s ease;
          pointer-events: none;
        }

        .sleek-doc-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-md);
          border-color: rgba(255, 255, 255, 0.1);
        }
        
        .sleek-doc-card:hover::before {
          opacity: 1;
        }

        .library-grid.list .sleek-doc-card {
          flex-direction: row;
          align-items: center;
          padding: 16px 24px;
          gap: 24px;
        }

        .doc-topbar {
          display: flex; 
          justify-content: space-between; 
          align-items: center;
          margin-bottom: 16px; 
        }

        .library-grid.list .doc-topbar {
          margin-bottom: 0;
          min-width: 150px;
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }

        .doc-domain {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-secondary);
          letter-spacing: 0.05em;
        }

        .doc-score { 
          font-family: var(--font-sans);
          font-size: 11px;
          font-weight: 600;
          color: var(--text-secondary); 
          background: rgba(255, 255, 255, 0.05); 
          padding: 4px 8px;
          border-radius: 4px;
        }

        .doc-title { 
          font-size: 1.2rem; 
          line-height: 1.4; 
          margin-bottom: 12px; 
        }
        
        .library-grid.list .doc-title { 
          flex: 1; 
          margin-bottom: 0; 
          font-size: 1.1rem; 
        }

        .doc-preview {
          font-size: 14px; 
          color: var(--text-secondary);
          margin-bottom: 24px;
          display: -webkit-box; 
          -webkit-line-clamp: 3; 
          -webkit-box-orient: vertical;
          overflow: hidden;
          flex-grow: 1;
        }

        .doc-bottombar {
          display: flex; 
          justify-content: space-between; 
          align-items: center;
          margin-top: auto;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .library-grid.list .doc-bottombar {
          margin-top: 0;
          padding-top: 0;
          border-top: none;
          min-width: 200px;
        }

        .tag-list { 
          display: flex; 
          gap: 8px;
          flex-wrap: wrap;
        }

        .action-btn {
          background: transparent; 
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          font-family: var(--font-sans); 
          font-size: 12px; 
          font-weight: 600;
          padding: 6px 12px; 
          border-radius: 6px;
          cursor: pointer; 
          transition: all 0.2s;
        }

        .action-btn:hover { 
          background: var(--text-color); 
          color: var(--bg-color); 
          border-color: var(--text-color);
        }
      `}</style>
    </div>
  );
}

export default Library;
