import { useState, useEffect, useRef } from 'react';
import { Search, Hash, Brain, Sparkles, Clock, Globe, Trash2 } from 'lucide-react';
import { searchAPI } from '../services/api';

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
    return () => { clearTimeout(handler); };
  }, [value, delay]);
  return debouncedValue;
}

function SearchModeToggle({ mode, onModeChange }) {
  const modes = [
    { id: 'keyword', label: 'Keyword', icon: Hash },
    { id: 'semantic', label: 'Semantic', icon: Brain },
    { id: 'hybrid', label: 'Hybrid', icon: Sparkles },
  ];

  return (
    <div className="search-mode-sleek">
      {modes.map((m) => {
        const Icon = m.icon;
        return (
          <button
            key={m.id}
            className={`mode-btn ${mode === m.id ? 'active' : ''}`}
            onClick={() => onModeChange(m.id)}
            type="button"
          >
            <Icon size={14} className="mode-icon" />
            <span>{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function SearchResultCard({ result, query, onDelete }) {
  const [deleting, setDeleting] = useState(false);

  const highlightTitle = (title, query) => {
    if (!query || !title) return title;
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    let highlighted = title;
    words.forEach(word => {
      const regex = new RegExp(`(${word})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark class="highlight-amber">$1</mark>');
    });
    return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
  };

  const getScoreDisplay = () => {
    const score = result.similarity_score || result.combined_score || result.relevance_score;
    if (!score) return null;
    return `${(score * 100).toFixed(0)}% Match`;
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (deleting) {
      onDelete && onDelete(result.id);
    } else {
      setDeleting(true);
      setTimeout(() => setDeleting(false), 3000);
    }
  };

  return (
    <div className={`result-card sleek-panel ${deleting ? 'confirm-delete' : ''}`}>
      <div className="result-topbar">
        <div className="domain-wrap">
          <Globe size={12} className="domain-icon" />
          <span className="result-domain">{result.domain}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {getScoreDisplay() && <span className="result-score badge-amber">{getScoreDisplay()}</span>}
          <button 
            className={`delete-btn ${deleting ? 'active' : ''}`}
            onClick={handleDelete}
            title={deleting ? "Confirm delete" : "Delete"}
          >
            <Trash2 size={14} />
            {deleting && <span className="confirm-text">Confirm?</span>}
          </button>
        </div>
      </div>

      <h3 className="result-title">
        <a href={result.source_url} target="_blank" rel="noopener noreferrer">
          {highlightTitle(result.title, query)}
        </a>
      </h3>

      {result.matched_excerpt && (
        <p 
          className="result-excerpt"
          dangerouslySetInnerHTML={{ __html: result.matched_excerpt }}
        />
      )}

      <div className="result-bottombar">
        <div className="tag-list">
          {result.tags?.slice(0, 3).map((tag, idx) => (
            <span key={idx} className="mono-tag amber">#{tag}</span>
          ))}
        </div>
        <div className="result-meta">
          {result.reading_time_minutes > 0 && (
            <span className="meta-item"><Clock size={12}/> {result.reading_time_minutes}m read</span>
          )}
          {result.difficulty && (
            <span className="meta-item badge-outline">Complexity: {result.difficulty}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function SearchPage({ initialQuery = '', onDeleteDocument }) {
  const [query, setQuery] = useState(initialQuery);
  const [mode, setMode] = useState('hybrid');
  const [results, setResults] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [latency, setLatency] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  const [searchHistory, setSearchHistory] = useState([]);
  
  const inputRef = useRef(null);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    loadSearchHistory();
    if (inputRef.current) inputRef.current.focus();
    if (initialQuery && initialQuery.trim()) {
      setQuery(initialQuery);
      performSearch(initialQuery);
    }
  }, []);

  useEffect(() => {
    if (debouncedQuery && debouncedQuery.length >= 2) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
      setHasSearched(false);
    }
  }, [debouncedQuery, mode]);

  const loadSearchHistory = async () => {
    try {
      const response = await searchAPI.getHistory(5);
      setSearchHistory(response.data.history || []);
    } catch { /* ignore */ }
  };

  const performSearch = async (searchQuery) => {
    setIsLoading(true);
    try {
      const response = await searchAPI.search(searchQuery, mode, {});
      setResults(response.data.items || []);
      setTotalResults(response.data.total || 0);
      setLatency(response.data.latency_ms || 0);
      setHasSearched(true);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) performSearch(query);
  };

  return (
    <div className="search-page-sleek">
      <div className="search-hero">
        <h2 className="search-title">Neural Search</h2>
        <p className="search-subtitle">Query your knowledge graph using natural language or keywords.</p>
        
        <form onSubmit={handleSubmit} className={`search-form glass-panel ${query ? 'active' : ''}`}>
          <div className="search-input-wrapper">
            <Search className="search-icon-large" size={24} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything..."
              className="search-input"
            />
            {isLoading && <div className="spinner-loader"></div>}
          </div>
          <div className="search-controls">
            <SearchModeToggle mode={mode} onModeChange={setMode} />
            {hasSearched && !isLoading && (
              <div className="search-stats">
                <span>{totalResults} results</span>
                <span className="dot">•</span>
                <span>{latency}ms</span>
              </div>
            )}
          </div>
        </form>
      </div>

      <div className="search-content">
        {!isLoading && hasSearched && results.length > 0 && (
          <div className="search-results-list">
            {results.map((result) => (
              <SearchResultCard 
                key={result.id} 
                result={result} 
                query={query} 
                onDelete={(id) => {
                  onDeleteDocument && onDeleteDocument(id);
                  setResults(prev => prev.filter(r => r.id !== id));
                }}
              />
            ))}
          </div>
        )}

        {!isLoading && hasSearched && results.length === 0 && (
          <div className="no-results sleek-panel">
            <Brain size={48} className="empty-icon" />
            <h3>No knowledge found</h3>
            <p>We couldn't find any documents matching your query. Try rephrasing or switching search modes.</p>
          </div>
        )}

        {!hasSearched && !isLoading && searchHistory.length > 0 && (
          <div className="search-history">
            <h3 className="history-title">Recent Searches</h3>
            <div className="history-tags">
              {searchHistory.map((item, idx) => (
                <button key={idx} className="history-tag" onClick={() => { setQuery(item.query); performSearch(item.query); }}>
                  <Clock size={14} />
                  <span>{item.query}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .search-page-sleek {
          display: flex;
          flex-direction: column;
          gap: 40px;
          max-width: 900px;
          margin: 0 auto;
        }

        .search-hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-top: 40px;
        }

        .search-title {
          font-size: 3rem;
          margin-bottom: 12px;
          background: linear-gradient(135deg, var(--text-color) 0%, rgba(255,255,255,0.6) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .search-subtitle {
          color: var(--text-secondary);
          font-size: 1.1rem;
          margin-bottom: 40px;
        }

        .search-form {
          width: 100%;
          border-radius: 24px;
          padding: 8px 16px 16px;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .search-form.active {
          box-shadow: 0 0 0 1px var(--accent-color), 0 8px 32px rgba(245, 200, 66, 0.1);
          background: rgba(255, 255, 255, 0.05);
        }

        .search-input-wrapper {
          display: flex;
          align-items: center;
          padding: 16px 8px;
          border-bottom: 1px solid var(--border-color);
        }

        .search-icon-large {
          color: var(--text-secondary);
          margin-right: 16px;
        }

        .search-input {
          flex: 1;
          font-family: var(--font-sans);
          font-size: 1.5rem;
          font-weight: 500;
          color: var(--text-color);
          background: transparent;
          border: none;
          outline: none;
        }

        .search-input::placeholder {
          color: var(--text-secondary);
          opacity: 0.5;
        }

        .spinner-loader {
          width: 24px; height: 24px;
          border: 3px solid rgba(245, 200, 66, 0.2);
          border-top-color: var(--accent-color);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin { 100% { transform: rotate(360deg); } }

        .search-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 16px;
          padding: 0 8px;
        }

        .search-mode-sleek {
          display: flex;
          background: rgba(0, 0, 0, 0.2);
          padding: 4px;
          border-radius: 12px;
          border: 1px solid var(--border-color);
        }

        .mode-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-family: var(--font-sans);
          font-size: 13px;
          font-weight: 500;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .mode-btn:hover { color: var(--text-color); }
        .mode-btn.active {
          background: rgba(255,255,255,0.08);
          color: var(--text-color);
          box-shadow: var(--shadow-sm);
        }

        .search-stats {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-secondary);
          letter-spacing: 0.05em;
        }
        
        .search-stats .dot { color: var(--border-color); }

        .search-content {
          width: 100%;
        }

        .search-results-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .result-card {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          transition: transform 0.2s;
          cursor: pointer;
        }
        
        .result-card:hover {
          transform: translateY(-2px);
          border-color: rgba(255,255,255,0.1);
        }

        .result-topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .domain-wrap {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-secondary);
        }

        .result-domain {
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.05em;
        }

        .badge-amber {
          font-family: var(--font-sans);
          font-size: 11px;
          font-weight: 700;
          color: var(--accent-color);
          background: rgba(245, 200, 66, 0.1);
          padding: 4px 10px;
          border-radius: 99px;
        }

        .result-title {
          font-size: 1.5rem;
          line-height: 1.3;
        }

        .result-title a { color: var(--text-color); text-decoration: none; transition: color 0.15s; }
        .result-title a:hover { color: var(--accent-color); }

        .highlight-amber {
          background-color: transparent;
          color: var(--accent-color);
          box-shadow: inset 0 -4px 0 rgba(245, 200, 66, 0.4);
          padding: 0 0.1em;
          border-radius: 2px;
        }

        .result-excerpt {
          font-size: 15px;
          line-height: 1.6;
          color: var(--text-secondary);
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .result-bottombar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 16px;
          border-top: 1px solid rgba(255,255,255,0.05);
          margin-top: 8px;
        }

        .tag-list { display: flex; gap: 8px; }

        .result-meta {
          display: flex;
          gap: 12px;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-sans);
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
        }
        
        .badge-outline {
          border: 1px solid var(--border-color);
          padding: 4px 8px;
          border-radius: 6px;
        }

        .no-results {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 64px 32px;
          text-align: center;
        }
        
        .empty-icon {
          color: rgba(245, 200, 66, 0.5);
          margin-bottom: 24px;
        }

        .no-results h3 { font-size: 1.5rem; margin-bottom: 12px; }
        .no-results p { color: var(--text-secondary); max-width: 400px; line-height: 1.5; }

        .delete-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .delete-btn:hover {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
        }

        .delete-btn.active {
          color: #fff;
          background: #ef4444;
          padding: 4px 8px;
        }

        .confirm-text {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .result-card.confirm-delete {
          border-color: rgba(239, 68, 68, 0.5);
          box-shadow: 0 0 15px rgba(239, 68, 68, 0.1);
        }

        .search-history {
          margin-top: 24px;
        }

        .history-title {
          font-family: var(--font-mono);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-secondary);
          margin-bottom: 16px;
        }

        .history-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .history-tag {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          padding: 8px 16px;
          border-radius: 99px;
          color: var(--text-secondary);
          font-family: var(--font-sans);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .history-tag:hover {
          background: rgba(255,255,255,0.08);
          color: var(--text-color);
          border-color: rgba(255,255,255,0.1);
        }
      `}</style>
    </div>
  );
}

export default SearchPage;
