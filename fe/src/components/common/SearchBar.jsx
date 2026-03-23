import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * SearchBar - Reusable search component
 * 
 * Props:
 * - value: string - Current search value
 * - onChange: (value: string) => void - Value change handler
 * - onSearch: (value: string) => void - Submit handler
 * - placeholder: string - Placeholder text
 * - autofocus: boolean - Focus on mount (default: false)
 * - mode: 'keyword' | 'semantic' | 'hybrid' - Search mode
 * - onModeChange: (mode) => void - Mode change handler
 * - showModeToggle: boolean - Show mode toggle inline (default: true)
 * - searchHistory: string[] - Array of recent searches
 * - onHistorySelect: (item) => void - History item selection
 * - debounceMs: number - Debounce delay in ms (default: 300)
 * - className: string - Additional CSS class
 */

export default function SearchBar({
  value,
  onChange,
  onSearch,
  placeholder = 'Search...',
  autofocus = false,
  mode = 'hybrid',
  onModeChange,
  showModeToggle = true,
  searchHistory = [],
  onHistorySelect,
  debounceMs = 300,
  className = ''
}) {
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  
  // Sync local value with prop
  useEffect(() => {
    setLocalValue(value);
  }, [value]);
  
  // Autofocus on mount
  useEffect(() => {
    if (autofocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autofocus]);
  
  // Debounced onChange
  const handleChange = useCallback((e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      onChange?.(newValue);
    }, debounceMs);
  }, [onChange, debounceMs]);
  
  // Clear debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);
  
  const handleSubmit = (e) => {
    e?.preventDefault();
    // Clear debounce and immediately trigger onChange
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    onChange?.(localValue);
    onSearch?.(localValue);
    setShowHistory(false);
  };
  
  const handleClear = () => {
    setLocalValue('');
    onChange?.('');
    inputRef.current?.focus();
  };
  
  const handleHistoryItemClick = (item) => {
    setLocalValue(item);
    onChange?.(item);
    onSearch?.(item);
    setShowHistory(false);
  };
  
  const handleFocus = () => {
    setIsFocused(true);
    // Show history dropdown when focused and input is empty
    if (!localValue && searchHistory.length > 0) {
      setShowHistory(true);
    }
  };
  
  const handleBlur = () => {
    setIsFocused(false);
    // Delay hiding to allow clicking on history items
    setTimeout(() => {
      setShowHistory(false);
    }, 200);
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleClear();
      inputRef.current?.blur();
    }
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };
  
  const cycleMode = () => {
    const modes = ['keyword', 'semantic', 'hybrid'];
    const currentIndex = modes.indexOf(mode);
    const nextIndex = (currentIndex + 1) % modes.length;
    onModeChange?.(modes[nextIndex]);
  };
  
  const getModeLabel = (m) => {
    switch (m) {
      case 'keyword': return 'Keyword';
      case 'semantic': return 'Semantic';
      case 'hybrid': return 'Hybrid';
      default: return m;
    }
  };
  
  const getModeIcon = (m) => {
    switch (m) {
      case 'keyword': return '🔍';
      case 'semantic': return '🧠';
      case 'hybrid': return '⚡';
      default: return '🔍';
    }
  };
  
  return (
    <div className={`search-bar-container ${className} ${isFocused ? 'focused' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
      <form onSubmit={handleSubmit} className="search-bar-form">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          
          <input
            ref={inputRef}
            type="text"
            value={localValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="search-input"
          />
          
          {localValue && (
            <button 
              type="button" 
              className="clear-button"
              onClick={handleClear}
              tabIndex={-1}
            >
              ×
            </button>
          )}
          
          {!showModeToggle && isFocused && (
            <button 
              type="button" 
              className="expand-button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              tabIndex={-1}
            >
              ⚙️
            </button>
          )}
        </div>
        
        {showModeToggle && (
          <button 
            type="button" 
            className="mode-toggle"
            onClick={cycleMode}
            title={`Current: ${getModeLabel(mode)} search`}
          >
            <span className="mode-icon">{getModeIcon(mode)}</span>
            <span className="mode-label">{getModeLabel(mode)}</span>
          </button>
        )}
        
        {(!showModeToggle || isCollapsed) && isFocused && (
          <div className="mode-dropdown">
            {['keyword', 'semantic', 'hybrid'].map((m) => (
              <button
                key={m}
                type="button"
                className={`mode-option ${mode === m ? 'active' : ''}`}
                onClick={() => {
                  onModeChange?.(m);
                  setIsCollapsed(false);
                }}
              >
                <span>{getModeIcon(m)}</span>
                <span>{getModeLabel(m)}</span>
              </button>
            ))}
          </div>
        )}
        
        <button type="submit" className="search-submit">
          Search
        </button>
      </form>
      
      {/* Search History Dropdown */}
      {showHistory && searchHistory.length > 0 && (
        <div className="search-history-dropdown">
          <div className="history-header">
            <span>Recent Searches</span>
            <button 
              type="button" 
              className="clear-history"
              onClick={() => {/* TODO: Clear history */}}
            >
              Clear
            </button>
          </div>
          <ul className="history-list">
            {searchHistory.slice(0, 5).map((item, idx) => (
              <li key={idx}>
                <button 
                  type="button"
                  className="history-item"
                  onClick={() => handleHistoryItemClick(item)}
                >
                  <span className="history-icon">🕐</span>
                  <span className="history-text">{item}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <style>{`
        .search-bar-container {
          position: relative;
          width: 100%;
        }
        
        .search-bar-form {
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          padding: 4px;
          transition: all 0.2s;
        }
        
        .search-bar-container.focused .search-bar-form {
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        .search-input-wrapper {
          display: flex;
          align-items: center;
          flex: 1;
          min-width: 0;
          gap: 8px;
        }
        
        .search-icon {
          font-size: 16px;
          margin-left: 8px;
          opacity: 0.5;
        }
        
        .search-input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 15px;
          padding: 10px 0;
          background: transparent;
          color: #1e293b;
        }
        
        .search-input::placeholder {
          color: #94a3b8;
        }
        
        .clear-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border: none;
          background: #f1f5f9;
          border-radius: 50%;
          font-size: 16px;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .clear-button:hover {
          background: #e2e8f0;
          color: #1e293b;
        }
        
        .expand-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border: none;
          background: transparent;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .expand-button:hover {
          background: #f1f5f9;
        }
        
        .mode-toggle {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border: none;
          background: #f1f5f9;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        
        .mode-toggle:hover {
          background: #e2e8f0;
        }
        
        .mode-icon {
          font-size: 14px;
        }
        
        .mode-label {
          display: none;
        }
        
        @media (min-width: 640px) {
          .mode-label {
            display: inline;
          }
        }
        
        .mode-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 4px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          padding: 8px;
          z-index: 100;
        }
        
        .mode-option {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 10px 12px;
          border: none;
          background: transparent;
          border-radius: 8px;
          font-size: 14px;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }
        
        .mode-option:hover {
          background: #f1f5f9;
        }
        
        .mode-option.active {
          background: #e0e7ff;
          color: #667eea;
        }
        
        .search-submit {
          padding: 10px 20px;
          border: none;
          background: #667eea;
          color: white;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .search-submit:hover {
          background: #5568d3;
        }
        
        /* Search History */
        .search-history-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 4px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          z-index: 100;
          overflow: hidden;
        }
        
        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid #f1f5f9;
        }
        
        .history-header span {
          font-size: 13px;
          font-weight: 600;
          color: #64748b;
        }
        
        .clear-history {
          border: none;
          background: none;
          font-size: 12px;
          color: #667eea;
          cursor: pointer;
        }
        
        .clear-history:hover {
          text-decoration: underline;
        }
        
        .history-list {
          list-style: none;
          padding: 8px;
          margin: 0;
        }
        
        .history-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 12px;
          border: none;
          background: transparent;
          border-radius: 8px;
          font-size: 14px;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }
        
        .history-item:hover {
          background: #f1f5f9;
        }
        
        .history-icon {
          font-size: 14px;
          opacity: 0.5;
        }
        
        .history-text {
          flex: 1;
        }
        
        /* Collapsed state */
        .search-bar-container.collapsed .mode-dropdown {
          display: block;
        }
        
        /* Dark Mode */
        .dark-mode .search-bar-form {
          background: #1f2937;
          border-color: #374151;
        }
        
        .dark-mode .search-input {
          color: #f1f5f9;
        }
        
        .dark-mode .search-input::placeholder {
          color: #6b7280;
        }
        
        .dark-mode .clear-button {
          background: #374151;
          color: #9ca3af;
        }
        
        .dark-mode .clear-button:hover {
          background: #4b5563;
          color: #f1f5f9;
        }
        
        .dark-mode .mode-toggle {
          background: #374151;
          color: #d1d5db;
        }
        
        .dark-mode .mode-toggle:hover {
          background: #4b5563;
        }
        
        .dark-mode .search-submit {
          background: #667eea;
        }
        
        .dark-mode .search-submit:hover {
          background: #5568d3;
        }
        
        .dark-mode .mode-dropdown,
        .dark-mode .search-history-dropdown {
          background: #1f2937;
          border-color: #374151;
        }
        
        .dark-mode .mode-option,
        .dark-mode .history-item {
          color: #d1d5db;
        }
        
        .dark-mode .mode-option:hover,
        .dark-mode .history-item:hover {
          background: #374151;
        }
        
        .dark-mode .mode-option.active {
          background: #3730a3;
          color: #a5b4fc;
        }
        
        .dark-mode .history-header {
          border-color: #374151;
        }
        
        .dark-mode .history-header span {
          color: #9ca3af;
        }
      `}</style>
    </div>
  );
}
