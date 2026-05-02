import { useState } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { 
  Home, Book, Folder, Globe, Edit3, Lightbulb, 
  Search, Plus, Settings, Keyboard, Sun, Moon, 
  User, Command, LogOut 
} from 'lucide-react';

function Sidebar({ 
  onQuickSave,
  tags = [],
  collections = [],
  recentSaves = [],
  isDarkMode,
  onToggleDarkMode,
  onOpenKeyboardShortcuts,
  onLogout
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const navigate = useNavigate();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/app' },
    { id: 'library', label: 'Library', icon: Book, path: '/app/library' },
    { id: 'collections', label: 'Collections', icon: Folder, path: '/app/collections' },
    { id: 'explore', label: 'Explore', icon: Globe, path: '/app/explore' },
    { id: 'annotations', label: 'Annotations', icon: Edit3, path: '/app/annotations' },
    { id: 'insights', label: 'Insights', icon: Lightbulb, path: '/app/insights' },
  ];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/app/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleTagClick = (tag) => {
    navigate(`/app/library?tag=${encodeURIComponent(tag)}`);
  };

  // Default placeholder data
  const displayTags = tags.length > 0 ? tags.map(t => typeof t === 'string' ? { name: t } : t).slice(0, 10) : [
    { name: 'technology', count: 12 },
    { name: 'learning', count: 8 },
    { name: 'productivity', count: 6 },
    { name: 'design', count: 5 },
  ];

  const displayRecent = recentSaves.length > 0 ? recentSaves : [
    { id: 1, title: 'Getting Started with React 19', domain: 'react.dev' },
    { id: 2, title: 'Python Best Practices', domain: 'python.org' },
  ];

  return (
    <aside className="sidebar-sleek">
      {/* Logo Section */}
      <Link className="sidebar-logo" to="/app" style={{ textDecoration: 'none' }}>
        <span className="logo-text">Smart<b>Keep</b></span>
      </Link>

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className={`sidebar-search ${isSearchFocused ? 'focused' : ''}`}>
        <Search size={16} className="search-icon" />
        <input
          type="text"
          placeholder="SEARCH..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
        />
        <span className="search-shortcut"><Command size={10} />K</span>
      </form>

      {/* Quick Save Button */}
      <button className="quick-save-btn" onClick={() => navigate('/app/add')}>
        <Plus size={16} strokeWidth={2.5} />
        <span>Save URL</span>
      </button>

      {/* Main Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              end={item.path === '/app'}
            >
              <Icon size={18} className="nav-icon" strokeWidth={2} />
              <span className="nav-label">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-scrollable">
        {/* Tag Cloud Section */}
        <div className="sidebar-section">
          <h4 className="section-title">TAGS</h4>
          <div className="tag-cloud">
            {displayTags.map((tag, index) => (
              <button key={index} className="tag-chip" onClick={() => handleTagClick(tag.name)}>
                #{tag.name}
              </button>
            ))}
          </div>
        </div>
        
        {/* Collections Section */}
        <div className="sidebar-section">
          <h4 className="section-title">COLLECTIONS</h4>
          <div className="recent-list">
            {collections.map((collection) => (
              <NavLink 
                key={collection.id} 
                to={`/app/collections/${collection.id}`}
                className={({ isActive }) => `recent-item ${isActive ? 'active' : ''}`}
                style={{ textDecoration: 'none' }}
              >
                <span className="collection-bullet" style={{ color: collection.color || 'var(--accent-color)' }}>•</span>
                <span className="recent-title">{collection.name}</span>
              </NavLink>
            ))}
            {collections.length === 0 && (
              <span className="empty-hint">No collections yet</span>
            )}
          </div>
        </div>

        {/* Recent Saves Section */}
        <div className="sidebar-section">
          <h4 className="section-title">RECENT</h4>
          <div className="recent-list">
            {displayRecent.map((item) => (
              <button key={item.id} className="recent-item" onClick={() => navigate(`/app/content/${item.id}`)}>
                <span className="recent-title">{item.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="sidebar-bottom">
        <NavLink className={({ isActive }) => `bottom-item ${isActive ? 'active' : ''}`} to="/app/settings">
          <Settings size={16} />
          <span>Settings</span>
        </NavLink>
        <button className="bottom-item" onClick={onOpenKeyboardShortcuts}>
          <Keyboard size={16} />
          <span>Shortcuts</span>
        </button>
        <button className="bottom-item dark-mode-toggle" onClick={onToggleDarkMode}>
          {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          <span>{isDarkMode ? 'Light' : 'Dark'} Mode</span>
        </button>
        
        <div className="user-section">
          <div className="user-avatar"><User size={14} /></div>
          <div className="user-info">
            <span className="user-name">User</span>
          </div>
          <button className="logout-mini-btn" onClick={onLogout} title="Logout">
            <LogOut size={14} />
          </button>
        </div>
      </div>

      <style>{`
        .sidebar-sleek {
          width: 250px;
          height: 100vh;
          background: transparent;
          border-right: 1px solid rgba(255,255,255,0.05);
          display: flex;
          flex-direction: column;
          position: fixed;
          left: 0;
          top: 0;
          z-index: 100;
          color: var(--text-color);
        }

        .sidebar-logo {
          padding: 24px;
          cursor: pointer;
          border-bottom: 1px solid var(--border-color);
          display: block;
        }

        .logo-text { 
          font-family: var(--font-serif);
          font-size: 20px; 
          font-weight: 900; 
          letter-spacing: -0.3px; 
          color: var(--text-color); 
          font-style: italic; 
        }
        .logo-text b { color: var(--accent-color); font-style: normal; }

        .sidebar-search {
          display: flex; align-items: center; gap: 8px;
          margin: 20px 16px; padding: 10px 14px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          transition: all 0.2s ease;
        }
        .sidebar-search.focused {
          border-color: var(--accent-color);
          box-shadow: 0 0 0 2px rgba(245, 200, 66, 0.1);
          background: rgba(255, 255, 255, 0.05);
        }
        .search-icon { color: var(--text-secondary); }
        .sidebar-search input {
          flex: 1; border: none; background: transparent;
          font-family: var(--font-sans); font-size: 13px; color: var(--text-color); outline: none;
        }
        .sidebar-search input::placeholder { color: var(--text-secondary); opacity: 0.5; }
        .search-shortcut {
          display: flex; align-items: center; gap: 2px;
          font-family: var(--font-mono); font-size: 10px; font-weight: 500;
          color: var(--text-secondary); padding: 2px 4px;
          background: rgba(255, 255, 255, 0.05); border-radius: 4px;
        }

        .quick-save-btn {
          display: flex; justify-content: center; align-items: center; gap: 8px;
          margin: 0 16px 24px; padding: 12px;
          background: var(--accent-color); color: var(--bg-color);
          border: none; border-radius: 8px;
          font-family: var(--font-sans); font-size: 13px; font-weight: 700;
          cursor: pointer; transition: all 0.2s;
        }
        .quick-save-btn:hover {
          background: var(--accent-hover);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(245, 200, 66, 0.2);
        }

        .sidebar-nav { display: flex; flex-direction: column; padding: 0 12px; gap: 4px; }
        .nav-item {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 14px; border: none;
          background: transparent; color: var(--text-secondary);
          cursor: pointer; transition: all 0.2s; text-align: left; width: 100%;
          border-right: 2px solid transparent;
          text-decoration: none;
        }
        .nav-item:hover { background: rgba(255, 255, 255, 0.02); color: var(--text-color); }
        .nav-item.active { 
          color: #fff; 
          font-weight: 600; 
          border-right: 2px solid var(--accent-color);
          background: linear-gradient(90deg, transparent 50%, rgba(245,200,66,0.05) 100%);
        }
        .nav-label { font-family: var(--font-sans); font-size: 13px; font-weight: 500; letter-spacing: 0.02em; }

        .sidebar-scrollable {
          flex: 1; overflow-y: auto;
          margin-top: 16px; padding: 0 16px;
        }
        .sidebar-scrollable::-webkit-scrollbar { width: 4px; }
        .sidebar-scrollable::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

        .sidebar-section { padding: 16px 0; border-top: 1px solid var(--border-color); }
        .sidebar-section:first-child { border-top: none; padding-top: 0; }
        .section-title {
          font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.1em;
          color: var(--text-secondary); margin-bottom: 12px; font-weight: 500;
        }

        .tag-cloud { display: flex; flex-wrap: wrap; gap: 6px; }
        .tag-chip {
          padding: 4px 10px; background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color); border-radius: 99px;
          font-family: var(--font-mono); font-size: 11px;
          color: var(--text-secondary); cursor: pointer; transition: all 0.15s;
        }
        .tag-chip:hover { background: rgba(245, 200, 66, 0.1); color: var(--accent-color); border-color: rgba(245, 200, 66, 0.3); }

        .recent-list { display: flex; flex-direction: column; gap: 4px; }
        .recent-item {
          display: flex; align-items: center; padding: 8px 10px;
          border-radius: 6px; border: none;
          background: transparent; cursor: pointer; text-align: left; width: 100%;
          transition: all 0.15s;
        }
        .recent-item:hover { background: rgba(255, 255, 255, 0.03); }
        .recent-item.active { background: rgba(245, 200, 66, 0.05); }
        .recent-item.active .recent-title { color: var(--accent-color); font-weight: 600; }
        
        .collection-bullet { margin-right: 8px; font-size: 18px; line-height: 1; }
        .recent-title {
          font-family: var(--font-sans); font-size: 12px; font-weight: 400; color: var(--text-secondary);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .recent-item:hover .recent-title { color: var(--text-color); }

        .empty-hint { font-size: 11px; color: var(--text-secondary); opacity: 0.6; padding: 0 10px; }

        .sidebar-bottom {
          padding: 16px; border-top: 1px solid var(--border-color);
          display: flex; flex-direction: column; gap: 6px;
        }
        .bottom-item {
          display: flex; align-items: center; gap: 10px; padding: 8px 12px;
          border-radius: 6px; border: none; background: transparent;
          cursor: pointer; text-align: left; width: 100%;
          font-family: var(--font-sans); font-size: 13px; font-weight: 500; color: var(--text-secondary);
          transition: all 0.15s;
          text-decoration: none;
        }
        .bottom-item:hover { background: rgba(255, 255, 255, 0.03); color: var(--text-color); }
        .bottom-item.active { color: var(--accent-color); }

        .user-section {
          display: flex; align-items: center; gap: 12px; padding: 12px; margin-top: 8px;
          background: rgba(255, 255, 255, 0.03); border-radius: 8px; border: 1px solid var(--border-color);
        }
        .user-avatar { 
          width: 24px; height: 24px; border-radius: 50%; 
          background: rgba(245, 200, 66, 0.2); color: var(--accent-color);
          display: flex; align-items: center; justify-content: center;
        }
        .user-name { font-family: var(--font-sans); font-size: 12px; font-weight: 600; color: var(--text-color); flex: 1; }
        .logout-mini-btn {
          background: transparent; border: none; color: var(--text-secondary);
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          padding: 4px; border-radius: 4px; transition: all 0.2s;
        }
        .logout-mini-btn:hover {
          color: #f07070; background: rgba(240, 112, 112, 0.1);
        }
      `}</style>
    </aside>
  );
}

export default Sidebar;
