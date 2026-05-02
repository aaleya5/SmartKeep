import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileBottomNav from './MobileBottomNav';
import CommandPalette from './CommandPalette';

function Layout({
  children,
  documents = [],
  isDarkMode,
  onToggleDarkMode,
  tags = [],
  collections = [],
  recentSaves = [],
  onOpenKeyboardShortcuts,
  onLogout
}) {
  const [isMobile, setIsMobile] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const navigate = useNavigate();

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle keyboard shortcut for command palette
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCommandPaletteClose = () => {
    setIsCommandPaletteOpen(false);
  };

  return (
    <div className={`app-layout ${isDarkMode ? 'dark-mode' : ''}`}>
      {/* Desktop Sidebar - hidden on mobile */}
      {!isMobile && (
        <Sidebar
          onQuickSave={() => navigate('/app/add')}
          tags={tags}
          collections={collections}
          recentSaves={recentSaves}
          isDarkMode={isDarkMode}
          onToggleDarkMode={onToggleDarkMode}
          onOpenKeyboardShortcuts={onOpenKeyboardShortcuts}
          onLogout={onLogout}
        />
      )}

      {/* Main Content Area */}
      <main 
        className="main-content-area"
        style={{
          marginLeft: isMobile ? '0' : '250px',
          marginBottom: isMobile ? '64px' : '0',
          minHeight: '100vh',
          width: isMobile ? '100%' : 'calc(100% - 250px)'
        }}
      >
        {children}
      </main>

      {/* Mobile Bottom Navigation - hidden on desktop */}
      {isMobile && (
        <MobileBottomNav />
      )}

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={handleCommandPaletteClose}
        documents={documents}
      />

      <style>{`
        .app-layout {
          --sidebar-width: 250px;
          --bottom-nav-height: 80px;
          --sidebar-bg: var(--nav-bg);
          --sidebar-border: var(--border-color);
          --hover-bg: var(--text-color);
          --active-bg: var(--accent-color);
          --search-bg: var(--bg-color);
          --tag-bg: var(--bg-color);
          --bottom-nav-bg: var(--nav-bg);
          --palette-bg: var(--bg-color);
          display: flex;
        }

        .main-content-area {
          transition: margin-left 0.1s ease;
          flex: 1;
        }

        /* Responsive adjustments */
        @media (max-width: 900px) {
          .main-content-area {
            margin-left: 0 !important;
            width: 100% !important;
            padding-bottom: calc(var(--bottom-nav-height) + 20px);
          }
        }

        /* Ensure proper stacking */
        .app-layout {
          position: relative;
        }
      `}</style>
    </div>
  );
}

export default Layout;
