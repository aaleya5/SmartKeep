import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

function CommandPalette({
  isOpen,
  onClose,
  documents = []
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState([
    'react hooks tutorial',
    'python async',
    'machine learning basics'
  ]);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  const navigate = useNavigate();

  const actionShortcuts = [
    { id: 'save-url', label: 'Save URL', icon: '🔗', action: 'save' },
    { id: 'new-collection', label: 'New Collection', icon: '📁', action: 'collection' },
    { id: 'go-settings', label: 'Go to Settings', icon: '⚙️', action: 'settings' },
  ];

  // Filter documents based on query
  const searchResults = query.length > 0 
    ? documents.filter(doc => 
        doc.title?.toLowerCase().includes(query.toLowerCase()) ||
        doc.summary?.toLowerCase().includes(query.toLowerCase()) ||
        doc.content?.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5)
    : [];

  // Determine what to show based on query
  const showActions = query.length === 0;
  const showRecent = query.length === 0 && recentSearches.length > 0;
  const showResults = query.length > 0 && searchResults.length > 0;
  const showNoResults = query.length > 0 && searchResults.length === 0;

  // Get all selectable items for keyboard navigation
  const getAllItems = useCallback(() => {
    const items = [];
    if (showActions) {
      actionShortcuts.forEach(action => items.push({ type: 'action', ...action }));
    }
    if (showRecent && query.length === 0) {
      recentSearches.forEach(search => items.push({ type: 'recent', label: search }));
    }
    if (showResults) {
      searchResults.forEach(doc => items.push({ type: 'result', ...doc }));
    }
    return items;
  }, [query, showActions, showRecent, showResults, searchResults, recentSearches, actionShortcuts]);

  // Focus input when palette opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    const items = getAllItems();
    if (items.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % items.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + items.length) % items.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (items[selectedIndex]) {
          handleSelect(items[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      case 'Tab':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % items.length);
        break;
    }
  };

  // Handle item selection
  const handleSelect = (item) => {
    if (item.type === 'action') {
      if (item.action === 'save') {
        navigate('/app/add');
      } else if (item.action === 'collection') {
        navigate('/app/collections');
      } else if (item.action === 'settings') {
        navigate('/app/settings');
      }
    } else if (item.type === 'recent') {
      navigate(`/app/search?q=${encodeURIComponent(item.label)}`);
    } else if (item.type === 'result') {
      navigate(`/app/content/${item.id}`);
    }
    onClose();
  };

  // Handle search input change
  const handleQueryChange = (e) => {
    setQuery(e.target.value);
    setSelectedIndex(0);
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/app/search?q=${encodeURIComponent(query)}`);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div 
        className="command-palette" 
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <form onSubmit={handleSubmit} className="palette-search">
          <span className="search-icon">🔍</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search your knowledge or type a command..."
            value={query}
            onChange={handleQueryChange}
            className="palette-input"
          />
          <span className="escape-hint">ESC</span>
        </form>

        {/* Results Container */}
        <div className="palette-results" ref={resultsRef}>
          {/* Action Shortcuts */}
          {showActions && (
            <div className="results-section">
              <div className="section-label">Actions</div>
              {actionShortcuts.map((action, index) => (
                <button
                  key={action.id}
                  className={`result-item ${selectedIndex === index ? 'selected' : ''}`}
                  onClick={() => handleSelect({ type: 'action', ...action })}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span className="item-icon">{action.icon}</span>
                  <span className="item-label">{action.label}</span>
                  <span className="item-shortcut">↵</span>
                </button>
              ))}
            </div>
          )}

          {/* Recent Searches */}
          {showRecent && (
            <div className="results-section">
              <div className="section-label">Recent Searches</div>
              {recentSearches.map((search, index) => {
                const itemIndex = actionShortcuts.length + index;
                return (
                  <button
                    key={index}
                    className={`result-item ${selectedIndex === itemIndex ? 'selected' : ''}`}
                    onClick={() => handleSelect({ type: 'recent', label: search })}
                    onMouseEnter={() => setSelectedIndex(itemIndex)}
                  >
                    <span className="item-icon">🕐</span>
                    <span className="item-label">{search}</span>
                    <span className="item-shortcut">↵</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Search Results */}
          {showResults && (
            <div className="results-section">
              <div className="section-label">Documents</div>
              {searchResults.map((doc, index) => {
                const itemIndex = actionShortcuts.length + recentSearches.length + index;
                return (
                  <button
                    key={doc.id}
                    className={`result-item ${selectedIndex === itemIndex ? 'selected' : ''}`}
                    onClick={() => handleSelect({ type: 'result', ...doc })}
                    onMouseEnter={() => setSelectedIndex(itemIndex)}
                  >
                    <span className="item-icon">📄</span>
                    <div className="item-content">
                      <span className="item-title">{doc.title}</span>
                      {doc.summary && (
                        <span className="item-summary">{doc.summary.substring(0, 60)}...</span>
                      )}
                    </div>
                    <span className="item-shortcut">↵</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* No Results */}
          {showNoResults && (
            <div className="no-results">
              <span className="no-results-icon">🔎</span>
              <span className="no-results-text">No documents found for "{query}"</span>
              <span className="no-results-hint">Press Enter to search in all content</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="palette-footer">
          <span className="footer-hint">
            <span className="key">↑↓</span> navigate
          </span>
          <span className="footer-hint">
            <span className="key">↵</span> select
          </span>
          <span className="footer-hint">
            <span className="key">esc</span> close
          </span>
        </div>
      </div>

      <style>{`
        .command-palette-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding-top: 15vh;
          z-index: 1000;
          animation: fadeIn 0.15s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .command-palette {
          width: 600px;
          max-width: 90vw;
          max-height: 400px;
          background: var(--palette-bg, #ffffff);
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          animation: slideIn 0.2s ease;
        }

        @keyframes slideIn {
          from { 
            opacity: 0;
            transform: translateY(-10px) scale(0.98);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .palette-search {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          border-bottom: 1px solid var(--sidebar-border, #e5e7eb);
        }

        .search-icon {
          font-size: 18px;
          opacity: 0.6;
        }

        .palette-input {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 16px;
          color: var(--text-primary, #1f2937);
          outline: none;
        }

        .palette-input::placeholder {
          color: var(--text-secondary, #9ca3af);
        }

        .escape-hint {
          font-size: 10px;
          padding: 3px 6px;
          background: var(--hover-bg, #f3f4f6);
          border-radius: 4px;
          color: var(--text-secondary, #9ca3af);
          border: 1px solid var(--sidebar-border, #e5e7eb);
        }

        .palette-results {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }

        .results-section {
          margin-bottom: 8px;
        }

        .section-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-secondary, #9ca3af);
          padding: 8px 12px 4px;
        }

        .result-item {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 10px 12px;
          border: none;
          background: transparent;
          border-radius: 8px;
          cursor: pointer;
          text-align: left;
          transition: background 0.1s;
        }

        .result-item:hover,
        .result-item.selected {
          background: var(--active-bg, #e0e7ff);
        }

        .item-icon {
          font-size: 16px;
          flex-shrink: 0;
          width: 24px;
          text-align: center;
        }

        .item-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .item-label,
        .item-title {
          font-size: 14px;
          color: var(--text-primary, #1f2937);
          font-weight: 500;
        }

        .item-summary {
          font-size: 12px;
          color: var(--text-secondary, #6b7280);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .item-shortcut {
          font-size: 11px;
          color: var(--text-secondary, #9ca3af);
          padding: 2px 6px;
          background: var(--hover-bg, #f3f4f6);
          border-radius: 4px;
          flex-shrink: 0;
        }

        .no-results {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px;
          color: var(--text-secondary, #9ca3af);
        }

        .no-results-icon {
          font-size: 32px;
          margin-bottom: 8px;
          opacity: 0.5;
        }

        .no-results-text {
          font-size: 14px;
          color: var(--text-primary, #374151);
          margin-bottom: 4px;
        }

        .no-results-hint {
          font-size: 12px;
          color: var(--text-secondary, #9ca3af);
        }

        .palette-footer {
          display: flex;
          justify-content: center;
          gap: 16px;
          padding: 10px;
          border-top: 1px solid var(--sidebar-border, #e5e7eb);
          background: var(--hover-bg, #f9fafb);
        }

        .footer-hint {
          font-size: 11px;
          color: var(--text-secondary, #9ca3af);
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .key {
          font-weight: 600;
          background: var(--sidebar-bg, #ffffff);
          padding: 2px 5px;
          border-radius: 3px;
          border: 1px solid var(--sidebar-border, #e5e7eb);
        }
      `}</style>
    </div>
  );
}

export default CommandPalette;
