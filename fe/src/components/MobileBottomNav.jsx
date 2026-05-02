import { NavLink, useNavigate } from 'react-router-dom';

function MobileBottomNav({ onLogout }) {
  const navigate = useNavigate();
  
  const tabs = [
    { id: 'dashboard', label: 'Home', icon: '🏠', path: '/app' },
    { id: 'library', label: 'Library', icon: '📚', path: '/app/library' },
    { id: 'add', label: 'Add', icon: '➕', path: '/app/add', isAction: true },
    { id: 'settings', label: 'Settings', icon: '👤', path: '/app/settings' },
    { id: 'logout', label: 'Logout', icon: '🚪', onClick: onLogout },
  ];

  return (
    <nav className="mobile-bottom-nav">
      {tabs.map((tab) => {
        if (tab.onClick) {
          return (
            <button
              key={tab.id}
              onClick={tab.onClick}
              className="mobile-tab"
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          );
        }
        return (
          <NavLink
            key={tab.id}
            to={tab.path}
            className={({ isActive }) => `mobile-tab ${isActive ? 'active' : ''} ${tab.isAction ? 'action-tab' : ''}`}
            end={tab.path === '/app'}
          >
            <span className={`tab-icon ${tab.isAction ? 'action-icon' : ''}`}>
              {tab.icon}
            </span>
            <span className="tab-label">{tab.label}</span>
          </NavLink>
        );
      })}

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
          text-decoration: none;
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
          text-decoration: none;
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
          color: var(--accent-color, #667eea);
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
          background: var(--accent-color);
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
      `}</style>
    </nav>
  );
}

export default MobileBottomNav;
