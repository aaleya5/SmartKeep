import { useState, useEffect, useRef } from 'react';
import { searchAPI } from '../services/api';

// Debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Search Mode Toggle Component
function SearchModeToggle({ mode, onModeChange }) {
  const modes = [
    { id: 'keyword', label: 'Keyword', tooltip: 'Fast text matching using full-text search. Best for exact matches.' },
    { id: 'semantic', label: 'Semantic', tooltip: 'AI-powered meaning-based search. Finds results by context and intent.' },
    { id: 'hybrid', label: 'Hybrid', tooltip: 'Combines keyword and semantic search for the best of both worlds.' },
  ];

  return (
    <div className="search-mode-toggle">
      {modes.map((m) => (
        <div key={m.id} className="mode-button-wrapper">
          <button
            className={`mode-button ${mode === m.id ? 'active' : ''}`}
            onClick={() => onModeChange(m.id)}
          >
            {m.label}
          </button>
          <span className="tooltip">{m.tooltip}</span>
        </div>
      ))}
    </div>
  );
}

// Search Result Card Component
function SearchResultCard({ result, query }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getDifficultyLabel = (difficulty) => {
    if (!difficulty) return null;
    const labels = {
      easy: 'Easy',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
    };
    return labels[difficulty] || difficulty;
  };

  const getDifficultyClass = (difficulty) => {
    if (!difficulty) return '';
    return `difficulty-${difficulty}`;
  };

  // Highlight matched keywords in title
  const highlightTitle = (title, query) => {
    if (!query || !title) return title;
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    let highlighted = title;
    words.forEach(word => {
      const regex = new RegExp(`(${word})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    });
    return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
  };

  // Get similarity score bar
  const getSimilarityBar = (score, mode) => {
    if (mode === 'keyword' || !score) return null;
    
    const percentage = Math.min(100, Math.round(score * 100));
    const color = percentage >= 70 ? '#10b981' : '#f59e0b'; // green for high, yellow for medium
    
    return (
      <div className="similarity-bar-container">
        <div 
          className="similarity-bar" 
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
        <span className="similarity-label">{percentage}% match</span>
      </div>
    );
  };

  return (
    <div className="search-result-card">
      {/* Similarity bar for semantic/hybrid modes */}
      {getSimilarityBar(result.similarity_score || result.combined_score, result.mode)}

      <div className="result-card-header">
        <div className="result-meta">
          {result.favicon_url && (
            <img 
              src={result.favicon_url} 
              alt="" 
              className="result-favicon" 
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          )}
          <span className="result-domain">{result.domain}</span>
          <span className="result-date">{formatDate(result.created_at)}</span>
        </div>
        <div className="result-badges">
          {result.reading_time_minutes > 0 && (
            <span className="reading-time-badge">
              📖 {result.reading_time_minutes} min
            </span>
          )}
          {result.difficulty && (
            <span className={`difficulty-badge ${getDifficultyClass(result.difficulty)}`}>
              {getDifficultyLabel(result.difficulty)}
            </span>
          )}
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

      {result.tags && result.tags.length > 0 && (
        <div className="result-tags">
          {result.tags.slice(0, 5).map((tag, idx) => (
            <span key={idx} className="tag">{tag}</span>
          ))}
        </div>
      )}

      {/* Score display */}
      {(result.relevance_score || result.similarity_score || result.combined_score) && (
        <div className="result-score-info">
          {result.relevance_score && (
            <span className="score-item">FTS: {result.relevance_score.toFixed(2)}</span>
          )}
          {result.similarity_score && (
            <span className="score-item">Similarity: {result.similarity_score.toFixed(2)}</span>
          )}
          {result.combined_score && (
            <span className="score-item">Combined: {result.combined_score.toFixed(2)}</span>
          )}
        </div>
      )}
    </div>
  );
}

// Main SearchPage Component
function SearchPage({ initialQuery = '' }) {
  // State
  const [query, setQuery] = useState(initialQuery);
  const [mode, setMode] = useState('hybrid');
  const [results, setResults] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [latency, setLatency] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Filter states
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [difficulty, setDifficulty] = useState('');
  
  // UI state
  const [showHistory, setShowHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
    const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [savedSearches, setSavedSearches] = useState([]);
  
  const inputRef = useRef(null);
  const debouncedQuery = useDebounce(query, 300);

  // Load search history on mount
  useEffect(() => {
    loadSearchHistory();
    loadSavedSearches();
    
    // Auto-focus on mount
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Perform initial search if initialQuery is provided
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      setQuery(initialQuery);
      performSearch(initialQuery);
    }
  }, []);

  // Live search when query changes (debounced)
  useEffect(() => {
    if (debouncedQuery && debouncedQuery.length >= 2) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
      setHasSearched(false);
    }
  }, [debouncedQuery, mode, selectedTags, selectedDomain, dateRange, difficulty]);

  // Get suggestions as user types
  useEffect(() => {
    if (query && query.length >= 2) {
      getSuggestions(query);
    } else {
      setSuggestions([]);
    }
  }, [query]);

  const loadSearchHistory = async () => {
    try {
      const response = await searchAPI.getHistory(10);
      setSearchHistory(response.data.history || []);
    } catch (err) {
      console.error('Failed to load search history:', err);
    }
  };

  const loadSavedSearches = async () => {
    try {
      const response = await searchAPI.getSavedSearches();
      setSavedSearches(response.data.saved_searches || []);
    } catch (err) {
      console.error('Failed to load saved searches:', err);
    }
  };

  const getSuggestions = async (q) => {
    try {
      const response = await searchAPI.getSuggestions(q);
      setSuggestions(response.data.suggestions || []);
      setShowSuggestions(true);
    } catch (err) {
      console.error('Failed to get suggestions:', err);
    }
  };

  const performSearch = async (searchQuery) => {
    setIsLoading(true);
    
    try {
      const options = {
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        domain: selectedDomain || undefined,
        date_from: dateRange !== 'all' ? getDateFromRange(dateRange) : undefined,
        date_to: dateRange !== 'all' ? new Date().toISOString().split('T')[0] : undefined,
        difficulty: difficulty || undefined,
      };
      
      const response = await searchAPI.search(searchQuery, mode, options);
      
      setResults(response.data.items || []);
      setTotalResults(response.data.total || 0);
      setLatency(response.data.latency_ms);
      setHasSearched(true);
      
      // Check for typo suggestion (simple heuristic)
      if (response.data.total === 0 && mode === 'keyword') {
        // Try semantic search to see if there are results
        try {
          const semanticResponse = await searchAPI.search(searchQuery, 'semantic', options);
          if (semanticResponse.data.total > 0) {
          }
        } catch {
          // Ignore
        }
      }
    } catch (err) {
      console.error('Search failed:', err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
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
      default:
        date = null;
    }
    return date ? date.toISOString().split('T')[0] : null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      performSearch(query);
      setShowHistory(false);
      setShowSuggestions(false);
    }
  };

  const handleHistoryClick = (historyItem) => {
    setQuery(historyItem.query);
    setMode(historyItem.mode);
    performSearch(historyItem.query);
    setShowHistory(false);
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    performSearch(suggestion);
  };

  const handleTrySemantic = () => {
    setMode('semantic');
    if (query.trim()) {
      performSearch(query);
    }
  };

  const handleSaveSearch = async () => {
    if (!saveName.trim() || !query.trim()) return;
    
    try {
      const filters = {
        tags: selectedTags,
        domain: selectedDomain,
        dateRange,
        difficulty,
      };
      
      await searchAPI.saveSearch(saveName, query, mode, filters);
      setShowSaveDialog(false);
      setSaveName('');
      loadSavedSearches();
    } catch (err) {
      console.error('Failed to save search:', err);
    }
  };

  const handleLoadSavedSearch = (saved) => {
    setQuery(saved.query);
    setMode(saved.mode);
    if (saved.filters) {
      setSelectedTags(saved.filters.tags || []);
      setSelectedDomain(saved.filters.domain || '');
      setDateRange(saved.filters.dateRange || 'all');
      setDifficulty(saved.filters.difficulty || '');
    }
    performSearch(saved.query);
  };

  const handleDeleteSavedSearch = async (id) => {
    try {
      await searchAPI.deleteSavedSearch(id);
      loadSavedSearches();
    } catch (err) {
      console.error('Failed to delete saved search:', err);
    }
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setSelectedDomain('');
    setDateRange('all');
    setDifficulty('');
  };

  const activeFiltersCount = 
    selectedTags.length + 
    (selectedDomain ? 1 : 0) + 
    (dateRange !== 'all' ? 1 : 0) + 
    (difficulty ? 1 : 0);

  return (
    <div className="search-page">
      {/* Search Header */}
      <div className="search-header">
        <form onSubmit={handleSubmit} className="search-form-main">
          <div className="search-input-container">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                if (!query) setShowHistory(true);
                setShowSuggestions(query.length >= 2);
              }}
              onBlur={() => {
                setTimeout(() => {
                  setShowHistory(false);
                  setShowSuggestions(false);
                }, 200);
              }}
              placeholder="Search your saved content..."
              className="search-input-large"
            />
            
            {/* Search History Dropdown */}
            {showHistory && searchHistory.length > 0 && (
              <div className="search-dropdown history-dropdown">
                <div className="dropdown-header">Recent Searches</div>
                {searchHistory.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="dropdown-item"
                    onClick={() => handleHistoryClick(item)}
                  >
                    <span className="history-icon">🕐</span>
                    <span className="history-query">{item.query}</span>
                    <span className="history-mode">{item.mode}</span>
                  </div>
                ))}
              </div>
            )}
            
            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="search-dropdown suggestions-dropdown">
                {suggestions.map((suggestion, idx) => (
                  <div 
                    key={idx} 
                    className="dropdown-item"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <span className="suggestion-icon">🔍</span>
                    <span className="suggestion-text">{suggestion}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <SearchModeToggle mode={mode} onModeChange={setMode} />
        </form>
      </div>

      {/* Filters Bar */}
      {hasSearched && (
        <div className="search-filters-bar">
          <div className="filters-left">
            <select 
              value={selectedTags[0] || ''}
              onChange={(e) => setSelectedTags(e.target.value ? [e.target.value] : [])}
              className="filter-select"
            >
              <option value="">All Tags</option>
              {/* Dynamic tags would come from API */}
            </select>
            
            <select 
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="filter-select"
            >
              <option value="">All Domains</option>
              {/* Dynamic domains would come from API */}
            </select>
            
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="3months">Last 3 Months</option>
            </select>
            
            <select 
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="filter-select"
            >
              <option value="">All Difficulty</option>
              <option value="easy">Easy</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            
            {activeFiltersCount > 0 && (
              <button className="clear-filters-btn" onClick={clearFilters}>
                Clear ({activeFiltersCount})
              </button>
            )}
          </div>
          
          <div className="filters-right">
            {query && (
              <button 
                className="save-search-btn"
                onClick={() => setShowSaveDialog(true)}
              >
                💾 Save Search
              </button>
            )}
          </div>
        </div>
      )}

      {/* Results Info */}
      {hasSearched && (
        <div className="results-info">
          <span className="results-count">
            {totalResults} {totalResults === 1 ? 'result' : 'results'} for '{query}'
            {activeFiltersCount > 0 && ` · filtered to ${results.length}`}
          </span>
          {latency !== null && (
            <span className={`latency ${latency < 100 ? 'fast' : latency < 500 ? 'medium' : 'slow'}`}>
              ⚡ Found in {latency}ms
            </span>
          )}
        </div>
      )}

      {/* Saved Searches */}
      {savedSearches.length > 0 && !hasSearched && (
        <div className="saved-searches-section">
          <h3>Saved Searches</h3>
          <div className="saved-searches-list">
            {savedSearches.map((saved) => (
              <div key={saved.id} className="saved-search-item">
                <span 
                  className="saved-search-name"
                  onClick={() => handleLoadSavedSearch(saved)}
                >
                  {saved.name}
                </span>
                <span className="saved-search-meta">
                  {saved.query} · {saved.mode}
                </span>
                <button 
                  className="delete-saved-btn"
                  onClick={() => handleDeleteSavedSearch(saved.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="search-loading">
          <div className="spinner"></div>
          <span>Searching...</span>
        </div>
      )}

      {/* Results */}
      {!isLoading && hasSearched && results.length > 0 && (
        <div className="search-results">
          {results.map((result) => (
            <SearchResultCard 
              key={result.id} 
              result={result} 
              query={query}
            />
          ))}
        </div>
      )}

      {/* No Results - Keyword Mode */}
      {!isLoading && hasSearched && results.length === 0 && mode === 'keyword' && (
        <div className="no-results">
          <div className="no-results-icon">🔍</div>
          <h3>No results found</h3>
          <p>No documents match your keyword search for "{query}"</p>
          <button className="try-semantic-btn" onClick={handleTrySemantic}>
            Try Semantic Search →
          </button>
        </div>
      )}

      {/* No Results - Other Modes */}
      {!isLoading && hasSearched && results.length === 0 && mode !== 'keyword' && (
        <div className="no-results">
          <div className="no-results-icon">🔍</div>
          <h3>No results found</h3>
          <p>No documents match your search for "{query}"</p>
          <p className="no-results-hint">Try different keywords or adjust your filters</p>
        </div>
      )}

      {/* Empty State - No Search Yet */}
      {!hasSearched && !isLoading && (
        <div className="search-empty-state">
          <div className="empty-icon">🔍</div>
          <h3>Search your saved content</h3>
          <p>Enter a search query to find documents in your library</p>
          
          {searchHistory.length > 0 && (
            <div className="search-tips">
              <h4>Recent searches:</h4>
              <div className="recent-searches">
                {searchHistory.slice(0, 5).map((item, idx) => (
                  <button 
                    key={idx}
                    className="recent-search-btn"
                    onClick={() => handleHistoryClick(item)}
                  >
                    {item.query}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Save Search Dialog */}
      {showSaveDialog && (
        <div className="modal-overlay" onClick={() => setShowSaveDialog(false)}>
          <div className="save-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Save This Search</h3>
            <p>Save "{query}" for later</p>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Search name..."
              className="save-name-input"
              autoFocus
            />
            <div className="dialog-buttons">
              <button 
                className="btn secondary"
                onClick={() => setShowSaveDialog(false)}
              >
                Cancel
              </button>
              <button 
                className="btn primary"
                onClick={handleSaveSearch}
                disabled={!saveName.trim()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .search-page {
          max-width: 900px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }

        /* Search Header */
        .search-header {
          margin-bottom: 1.5rem;
        }

        .search-form-main {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .search-input-container {
          position: relative;
        }

        .search-input-large {
          width: 100%;
          padding: 1rem 1.5rem;
          font-size: 1.25rem;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          background: white;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .search-input-large:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        /* Search Mode Toggle */
        .search-mode-toggle {
          display: flex;
          justify-content: center;
          gap: 0;
          background: #f3f4f6;
          border-radius: 8px;
          padding: 4px;
          width: fit-content;
          margin: 0 auto;
        }

        .mode-button-wrapper {
          position: relative;
        }

        .mode-button {
          padding: 0.5rem 1.25rem;
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          color: #6b7280;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .mode-button.active {
          background: white;
          color: #667eea;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .mode-button:hover:not(.active) {
          color: #374151;
        }

        /* Tooltip */
        .tooltip {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: #1f2937;
          color: white;
          padding: 0.5rem 0.75rem;
          border-radius: 6px;
          font-size: 0.75rem;
          white-space: nowrap;
          opacity: 0;
          visibility: hidden;
          transition: all 0.2s;
          margin-bottom: 8px;
          z-index: 100;
        }

        .tooltip::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 6px solid transparent;
          border-top-color: #1f2937;
        }

        .mode-button-wrapper:hover .tooltip {
          opacity: 1;
          visibility: visible;
        }

        /* Dropdowns */
        .search-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          margin-top: 4px;
          z-index: 50;
          max-height: 300px;
          overflow-y: auto;
        }

        .dropdown-header {
          padding: 0.75rem 1rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: #9ca3af;
          text-transform: uppercase;
          border-bottom: 1px solid #f3f4f6;
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .dropdown-item:hover {
          background: #f9fafb;
        }

        .history-icon, .suggestion-icon {
          font-size: 0.9rem;
        }

        .history-query, .suggestion-text {
          flex: 1;
          color: #374151;
        }

        .history-mode {
          font-size: 0.75rem;
          color: #9ca3af;
          text-transform: capitalize;
        }

        /* Filters Bar */
        .search-filters-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1rem;
          background: white;
          border-radius: 8px;
          margin-bottom: 1rem;
          flex-wrap: wrap;
          gap: 0.75rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .filters-left {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .filter-select {
          padding: 0.4rem 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 0.85rem;
          background: white;
          cursor: pointer;
        }

        .filter-select:focus {
          outline: none;
          border-color: #667eea;
        }

        .clear-filters-btn {
          padding: 0.4rem 0.75rem;
          background: #f3f4f6;
          border: none;
          border-radius: 6px;
          font-size: 0.8rem;
          color: #6b7280;
          cursor: pointer;
        }

        .clear-filters-btn:hover {
          background: #e5e7eb;
        }

        .save-search-btn {
          padding: 0.4rem 0.75rem;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.8rem;
          cursor: pointer;
        }

        .save-search-btn:hover {
          background: #5568d3;
        }

        /* Results Info */
        .results-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding: 0 0.5rem;
        }

        .results-count {
          font-size: 0.9rem;
          color: #6b7280;
        }

        .latency {
          font-size: 0.85rem;
          font-weight: 500;
        }

        .latency.fast { color: #059669; }
        .latency.medium { color: #d97706; }
        .latency.slow { color: #dc2626; }

        /* Search Results */
        .search-results {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        /* Search Result Card */
        .search-result-card {
          background: white;
          border-radius: 12px;
          padding: 1.25rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          transition: box-shadow 0.2s;
        }

        .search-result-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .similarity-bar-container {
          position: relative;
          height: 4px;
          background: #e5e7eb;
          border-radius: 2px;
          margin-bottom: 1rem;
          overflow: hidden;
        }

        .similarity-bar {
          height: 100%;
          border-radius: 2px;
          transition: width 0.3s;
        }

        .similarity-label {
          position: absolute;
          right: 0;
          top: -18px;
          font-size: 0.7rem;
          color: #6b7280;
        }

        .result-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .result-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          color: #9ca3af;
        }

        .result-favicon {
          width: 16px;
          height: 16px;
          border-radius: 2px;
        }

        .result-domain {
          color: #667eea;
        }

        .result-badges {
          display: flex;
          gap: 0.5rem;
        }

        .reading-time-badge, .difficulty-badge {
          font-size: 0.7rem;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
        }

        .reading-time-badge {
          background: #f3f4f6;
          color: #6b7280;
        }

        .difficulty-easy { background: #d1fae5; color: #059669; }
        .difficulty-intermediate { background: #fef3c7; color: #d97706; }
        .difficulty-advanced { background: #fee2e2; color: #dc2626; }

        .result-title {
          font-size: 1.1rem;
          margin: 0 0 0.75rem;
        }

        .result-title a {
          color: #1f2937;
          text-decoration: none;
        }

        .result-title a:hover {
          color: #667eea;
        }

        .result-title mark {
          background: #fef08a;
          color: inherit;
          padding: 0 2px;
          border-radius: 2px;
        }

        .result-excerpt {
          font-size: 0.9rem;
          color: #4b5563;
          line-height: 1.6;
          margin-bottom: 0.75rem;
        }

        .result-excerpt mark {
          background: #fef3c7;
          font-weight: 600;
          padding: 0 2px;
        }

        .result-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
          margin-bottom: 0.5rem;
        }

        .result-tags .tag {
          font-size: 0.7rem;
          padding: 0.2rem 0.5rem;
          background: #e0e7ff;
          color: #667eea;
          border-radius: 12px;
        }

        .result-score-info {
          display: flex;
          gap: 1rem;
          font-size: 0.75rem;
          color: #9ca3af;
          margin-top: 0.5rem;
        }

        /* No Results */
        .no-results {
          text-align: center;
          padding: 3rem;
          background: white;
          border-radius: 12px;
        }

        .no-results-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .no-results h3 {
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .no-results p {
          color: #6b7280;
          margin-bottom: 1rem;
        }

        .no-results-hint {
          font-size: 0.9rem;
          color: #9ca3af;
        }

        .try-semantic-btn {
          padding: 0.75rem 1.5rem;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.95rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .try-semantic-btn:hover {
          background: #5568d3;
        }

        /* Empty State */
        .search-empty-state {
          text-align: center;
          padding: 4rem 2rem;
          background: white;
          border-radius: 12px;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .search-empty-state h3 {
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .search-empty-state p {
          color: #6b7280;
          margin-bottom: 2rem;
        }

        .search-tips {
          text-align: left;
          max-width: 400px;
          margin: 0 auto;
        }

        .search-tips h4 {
          font-size: 0.9rem;
          color: #6b7280;
          margin-bottom: 0.75rem;
        }

        .recent-searches {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .recent-search-btn {
          padding: 0.4rem 0.75rem;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          font-size: 0.85rem;
          color: #4b5563;
          cursor: pointer;
          transition: all 0.2s;
        }

        .recent-search-btn:hover {
          background: #e5e7eb;
          border-color: #667eea;
          color: #667eea;
        }

        /* Loading */
        .search-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 3rem;
          gap: 1rem;
          color: #6b7280;
        }

        /* Saved Searches Section */
        .saved-searches-section {
          margin-bottom: 2rem;
        }

        .saved-searches-section h3 {
          font-size: 1rem;
          color: #374151;
          margin-bottom: 1rem;
        }

        .saved-searches-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .saved-search-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .saved-search-name {
          font-weight: 500;
          color: #374151;
          cursor: pointer;
        }

        .saved-search-name:hover {
          color: #667eea;
        }

        .saved-search-meta {
          flex: 1;
          font-size: 0.8rem;
          color: #9ca3af;
        }

        .delete-saved-btn {
          background: none;
          border: none;
          font-size: 1.25rem;
          color: #9ca3af;
          cursor: pointer;
          padding: 0 0.25rem;
        }

        .delete-saved-btn:hover {
          color: #dc2626;
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .save-dialog {
          background: white;
          padding: 1.5rem;
          border-radius: 12px;
          width: 90%;
          max-width: 400px;
        }

        .save-dialog h3 {
          margin: 0 0 0.5rem;
          color: #1f2937;
        }

        .save-dialog p {
          color: #6b7280;
          margin-bottom: 1rem;
          font-size: 0.9rem;
        }

        .save-name-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 1rem;
          margin-bottom: 1rem;
        }

        .save-name-input:focus {
          outline: none;
          border-color: #667eea;
        }

        .dialog-buttons {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
        }

        .btn {
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn.primary {
          background: #667eea;
          color: white;
          border: none;
        }

        .btn.primary:hover {
          background: #5568d3;
        }

        .btn.primary:disabled {
          background: #a5b4fc;
          cursor: not-allowed;
        }

        .btn.secondary {
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #e5e7eb;
        }

        .btn.secondary:hover {
          background: #e5e7eb;
        }

        /* Dark mode support */
        .app.dark-mode .search-input-large {
          background: #1f2937;
          border-color: #374151;
          color: #f3f4f6;
        }

        .app.dark-mode .search-mode-toggle {
          background: #374151;
        }

        .app.dark-mode .mode-button {
          color: #9ca3af;
        }

        .app.dark-mode .mode-button.active {
          background: #1f2937;
          color: #a5b4fc;
        }

        .app.dark-mode .search-dropdown,
        .app.dark-mode .search-filters-bar,
        .app.dark-mode .search-result-card,
        .app.dark-mode .no-results,
        .app.dark-mode .search-empty-state,
        .app.dark-mode .saved-search-item,
        .app.dark-mode .save-dialog {
          background: #1f2937;
          border-color: #374151;
        }

        .app.dark-mode .dropdown-header {
          color: #6b7280;
          border-color: #374151;
        }

        .app.dark-mode .dropdown-item:hover {
          background: #374151;
        }

        .app.dark-mode .history-query,
        .app.dark-mode .suggestion-text {
          color: #d1d5db;
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

        .app.dark-mode .result-title a {
          color: #f3f4f6;
        }

        .app.dark-mode .result-excerpt {
          color: #d1d5db;
        }

        .app.dark-mode .result-tags .tag {
          background: #4f46e5;
          color: #e0e7ff;
        }

        .app.dark-mode .result-score-info {
          color: #6b7280;
        }

        .app.dark-mode .no-results h3,
        .app.dark-mode .search-empty-state h3 {
          color: #f3f4f6;
        }

        .app.dark-mode .no-results p,
        .app.dark-mode .search-empty-state p {
          color: #9ca3af;
        }

        .app.dark-mode .save-name-input {
          background: #374151;
          border-color: #4b5563;
          color: #f3f4f6;
        }
      `}</style>
    </div>
  );
}

export default SearchPage;
