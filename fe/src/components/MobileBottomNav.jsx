function MobileBottomNav({ currentPage, onNavigate, onAddClick }) {
  const tabs = [
    { id: 'dashboard', label: 'Home', icon: '🏠' },
    { id: 'search', label: 'Search', icon: '🔍' },
    { id: 'add', label: 'Add', icon: '➕', isAction: true },
    { id: 'library', label: 'Library', icon: '📚' },
    { id: 'profile', label: 'Profile', icon: '👤' },
  ];

  const handleTabClick = (tab) => {
    if (tab.isAction) {
      onAddClick();
    } else {
      onNavigate(tab.id);
    }
  };

  const getActiveTab = () => {
    // Map current page to mobile tab
    const pageToTab = {
      'dashboard': 'dashboard',
      'search': 'search',
      'add': 'add',
      'library': 'library',
      'collections': 'library',
      'explore': 'library',
      'annotations': 'library',
      'insights': 'library',
      'profile': 'profile',
      'settings': 'profile',
    };
    return pageToTab[currentPage] || 'dashboard';
  };

  const activeTab = getActiveTab();

  return (
    <nav className="mobile-bottom-nav">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`mobile-tab ${activeTab === tab.id ? 'active' : ''} ${tab.isAction ? 'action-tab' : ''}`}
          onClick={() => handleTabClick(tab)}
        >
          <span className={`tab-icon ${tab.isAction ? 'action-icon' : ''}`}>
            {tab.icon}
          </span>
          <span className="tab-label">{tab.label}</span>
        </button>
      ))}

      <style>{`
        .mobile-bottom-nav {
          display: none;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 64px;
          background: var(--bottom-nav-bg, #ffffff);
          border-top: 1px solid var(--sidebar-border, #e5e7eb);
          justify-content: space-around;
          align-items: center;
          z-index: 100;
          padding: 0 8px;
          padding-bottom: env(safe-area-inset-bottom, 8px);
        }

        @media (max-width: 767px) {
          .mobile-bottom-nav {
            display: flex;
          }
        }

        .mobile-tab {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 8px 12px;
          border: none;
          background: transparent;
          cursor: pointer;
          transition: all 0.2s;
          border-radius: 12px;
          min-width: 56px;
        }

        .mobile-tab:active {
          transform: scale(0.95);
        }

        .tab-icon {
          font-size: 20px;
          transition: transform 0.2s;
        }

        .mobile-tab.active .tab-icon {
          transform: scale(1.1);
        }

        .tab-label {
          font-size: 10px;
          font-weight: 500;
          color: var(--text-secondary, #9ca3af);
          transition: color 0.2s;
        }

        .mobile-tab.active .tab-label {
          color: var(--primary, #667eea);
          font-weight: 600;
        }

        /* Action Tab (Add Button) */
        .action-tab {
          position: relative;
          top: -12px;
        }

        .action-icon {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          transition: all 0.2s;
        }

        .action-tab:active .action-icon {
          transform: scale(0.95);
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
        }

        .action-tab .tab-label {
          position: absolute;
          bottom: 4px;
          font-size: 9px;
        }

        /* Hover Effects */
        .mobile-tab:not(.action-tab):hover {
          background: var(--hover-bg, #f3f4f6);
        }

        .mobile-tab:not(.action-tab):active {
          background: var(--active-bg, #e0e7ff);
        }

        /* Dark Mode */
        .mobile-bottom-nav.dark-mode {
          --bottom-nav-bg: #1f2937;
          --sidebar-border: #374151;
          --hover-bg: #374151;
          --active-bg: #4f46e5;
          --text-secondary: #9ca3af;
        }

        .mobile-bottom-nav.dark-mode .tab-label {
          color: #9ca3af;
        }

        .mobile-bottom-nav.dark-mode .mobile-tab.active .tab-label {
          color: #a5b4fc;
        }
      `}</style>
    </nav>
  );
}

export default MobileBottomNav;
