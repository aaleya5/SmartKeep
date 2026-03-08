import { useState } from 'react';

function Sidebar({ 
  currentPage, 
  onNavigate, 
  onQuickSave,
  onSearch,
  tags = [],
  recentSaves = [],
  isDarkMode,
  onToggleDarkMode,
  onOpenSettings,
  onOpenKeyboardShortcuts
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'library', label: 'Library', icon: '📚' },
    { id: 'collections', label: 'Collections', icon: '📁' },
    { id: 'explore', label: 'Explore', icon: '🌐' },
    { id: 'annotations', label: 'Annotations', icon: '📝' },
    { id: 'insights', label: 'Insights', icon: '💡' },
  ];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery);
      onNavigate('search');
    }
  };

  const handleTagClick = (tag) => {
    onNavigate('library', { filterTag: tag });
  };

  const handleRecentClick = (item) => {
    onNavigate('library', { selectedItem: item });
  };

  const handleLogoClick = () => {
    onNavigate('dashboard');
  };

  // Default placeholder data for tags and recent saves
  const displayTags = tags.length > 0 ? tags : [
    { name: 'technology', count: 12 },
    { name: 'learning', count: 8 },
    { name: 'productivity', count: 6 },
    { name: 'design', count: 5 },
    { name: 'programming', count: 4 },
    { name: 'ai', count: 3 },
    { name: 'tutorial', count: 2 },
    { name: 'reference', count: 1 },
  ];

  const displayRecent = recentSaves.length > 0 ? recentSaves : [
    { id: 1, title: 'Getting Started with React 19', domain: 'react.dev', favicon: '🔶' },
    { id: 2, title: 'Python Best Practices Guide', domain: 'python.org', favicon: '🐍' },
    { id: 3, title: 'Understanding TypeScript Generics', domain: 'typescriptlang.org', favicon: '💙' },
  ];

  return (
    <aside className="sidebar">
      {/* Logo Section */}
      <div className="sidebar-logo" onClick={handleLogoClick}>
        <div className="logo-icon">SK</div>
        <span className="logo-text">SmartKeep</span>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className={`sidebar-search ${isSearchFocused ? 'focused' : ''}`}>
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="Search your knowledge..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
        />
        <span className="search-shortcut">⌘K</span>
      </form>

      {/* Quick Save Button */}
      <button className="quick-save-btn" onClick={onQuickSave}>
        <span className="plus-icon">+</span>
        <span>Save URL</span>
      </button>

      {/* Main Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Tag Cloud Section */}
      <div className="sidebar-section tag-cloud-section">
        <h4 className="section-title">Popular Tags</h4>
        <div className="tag-cloud">
          {displayTags.map((tag, index) => (
            <button
              key={index}
              className="tag-chip"
              onClick={() => handleTagClick(tag.name)}
            >
              {tag.name}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Saves Section */}
      <div className="sidebar-section recent-saves-section">
        <h4 className="section-title">Recent Saves</h4>
        <div className="recent-list">
          {displayRecent.map((item) => (
            <button
              key={item.id}
              className="recent-item"
              onClick={() => handleRecentClick(item)}
            >
              <span className="recent-favicon">{item.favicon}</span>
              <span className="recent-title">{item.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Section */}
      <div className="sidebar-bottom">
        <button className="bottom-item" onClick={onOpenSettings}>
          <span className="bottom-icon">⚙️</span>
          <span>Settings</span>
        </button>
        <button className="bottom-item" onClick={onOpenKeyboardShortcuts}>
          <span className="bottom-icon">⌨️</span>
          <span>Keyboard Shortcuts</span>
        </button>
        <button className="bottom-item dark-mode-toggle" onClick={onToggleDarkMode}>
          <span className="bottom-icon">{isDarkMode ? '☀️' : '🌙'}</span>
          <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        
        {/* User Section */}
        <div className="user-section">
          <div className="user-avatar">U</div>
          <div className="user-info">
            <span className="user-name">User</span>
            <span className="user-email">user@example.com</span>
          </div>
        </div>
      </div>

      <style>{`
        .sidebar {
          width: 280px;
          height: 100vh;
          background: var(--sidebar-bg, #ffffff);
          border-right: 1px solid var(--sidebar-border, #e5e7eb);
          display: flex;
          flex-direction: column;
          position: fixed;
          left: 0;
          top: 0;
          z-index: 100;
        }

        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 20px 16px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .sidebar-logo:hover {
          background: var(--hover-bg, #f3f4f6);
        }

        .logo-icon {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 14px;
        }

        .logo-text {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary, #1f2937);
        }

        /* Search Bar */
        .sidebar-search {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 12px 16px;
          padding: 10px 12px;
          background: var(--search-bg, #f3f4f6);
          border-radius: 10px;
          border: 2px solid transparent;
          transition: all 0.2s;
        }

        .sidebar-search.focused {
          border-color: var(--primary, #667eea);
          background: var(--sidebar-bg, #ffffff);
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .search-icon {
          font-size: 14px;
          opacity: 0.6;
        }

        .sidebar-search input {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 14px;
          color: var(--text-primary, #1f2937);
          outline: none;
        }

        .sidebar-search input::placeholder {
          color: var(--text-secondary, #9ca3af);
        }

        .search-shortcut {
          font-size: 11px;
          padding: 2px 6px;
          background: var(--sidebar-bg, #ffffff);
          border-radius: 4px;
          color: var(--text-secondary, #9ca3af);
          border: 1px solid var(--sidebar-border, #e5e7eb);
        }

        /* Quick Save Button */
        .quick-save-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin: 0 12px 20px;
          padding: 12px 16px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .quick-save-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .plus-icon {
          font-size: 18px;
          font-weight: 400;
        }

        /* Main Navigation */
        .sidebar-nav {
          display: flex;
          flex-direction: column;
          padding: 0 8px;
          gap: 2px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border: none;
          background: transparent;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
          width: 100%;
        }

        .nav-item:hover {
          background: var(--hover-bg, #f3f4f6);
        }

        .nav-item.active {
          background: var(--active-bg, #e0e7ff);
          color: var(--primary, #667eea);
        }

        .nav-icon {
          font-size: 16px;
        }

        .nav-label {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary, #374151);
        }

        .nav-item.active .nav-label {
          color: var(--primary, #667eea);
          font-weight: 600;
        }

        /* Sidebar Sections */
        .sidebar-section {
          padding: 16px;
          border-top: 1px solid var(--sidebar-border, #e5e7eb);
        }

        .section-title {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-secondary, #9ca3af);
          margin-bottom: 12px;
        }

        /* Tag Cloud */
        .tag-cloud {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .tag-chip {
          padding: 4px 10px;
          background: var(--tag-bg, #f3f4f6);
          border: none;
          border-radius: 12px;
          font-size: 12px;
          color: var(--text-secondary, #6b7280);
          cursor: pointer;
          transition: all 0.2s;
        }

        .tag-chip:hover {
          background: var(--primary-light, #e0e7ff);
          color: var(--primary, #667eea);
        }

        /* Recent Saves */
        .recent-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .recent-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          border: none;
          background: transparent;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s;
          text-align: left;
          width: 100%;
        }

        .recent-item:hover {
          background: var(--hover-bg, #f3f4f6);
        }

        .recent-favicon {
          font-size: 14px;
          flex-shrink: 0;
        }

        .recent-title {
          font-size: 12px;
          color: var(--text-primary, #374151);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* Bottom Section */
        .sidebar-bottom {
          margin-top: auto;
          padding: 12px;
          border-top: 1px solid var(--sidebar-border, #e5e7eb);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .bottom-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border: none;
          background: transparent;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s;
          text-align: left;
          width: 100%;
          font-size: 13px;
          color: var(--text-secondary, #6b7280);
        }

        .bottom-item:hover {
          background: var(--hover-bg, #f3f4f6);
          color: var(--text-primary, #374151);
        }

        .bottom-icon {
          font-size: 14px;
        }

        /* User Section */
        .user-section {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          margin-top: 8px;
          background: var(--hover-bg, #f3f4f6);
          border-radius: 8px;
        }

        .user-avatar {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 14px;
        }

        .user-info {
          display: flex;
          flex-direction: column;
        }

        .user-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary, #1f2937);
        }

        .user-email {
          font-size: 11px;
          color: var(--text-secondary, #9ca3af);
        }

        /* Dark Mode Overrides */
        .sidebar.dark-mode {
          --sidebar-bg: #1f2937;
          --sidebar-border: #374151;
          --hover-bg: #374151;
          --active-bg: #4f46e5;
          --search-bg: #374151;
          --tag-bg: #374151;
          --primary-light: #4f46e5;
          --text-primary: #f9fafb;
          --text-secondary: #9ca3af;
        }

        .sidebar.dark-mode .nav-label,
        .sidebar.dark-mode .recent-title,
        .sidebar.dark-mode .user-name {
          color: #f3f4f6;
        }

        .sidebar.dark-mode .tag-chip {
          color: #d1d5db;
        }

        .sidebar.dark-mode .user-email {
          color: #6b7280;
        }

        .sidebar.dark-mode .user-section {
          background: #374151;
        }
      `}</style>
    </aside>
  );
}

export default Sidebar;
