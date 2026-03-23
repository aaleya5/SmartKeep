import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import MobileBottomNav from './MobileBottomNav';
import CommandPalette from './CommandPalette';

function Layout({
  children,
  currentPage,
  onNavigate,
  documents = [],
  isDarkMode,
  onToggleDarkMode,
  tags = [],
  recentSaves = [],
  onSearch,
  onOpenSettings,
  onOpenKeyboardShortcuts
}) {
  const [isMobile, setIsMobile] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Initial check
    checkMobile();

    // Listen for window resize
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle keyboard shortcut for command palette
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Open command palette with Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleQuickSave = () => {
    // Navigate to add content view
    onNavigate('add');
    if (isMobile) {
      // On mobile, could open a modal instead
    }
  };

  const handleSearch = (query) => {
    onNavigate('search');
    // Pass search query to parent
    if (onSearch) {
      onSearch(query);
    }
  };

  const handleCommandPaletteClose = () => {
    setIsCommandPaletteOpen(false);
  };

  const handleGoToSettings = () => {
    onNavigate('settings');
  };

  return (
    <div className={`app-layout ${isDarkMode ? 'dark-mode' : ''}`}>
      {/* Desktop Sidebar - hidden on mobile */}
      {!isMobile && (
        <Sidebar
          currentPage={currentPage}
          onNavigate={onNavigate}
          onQuickSave={handleQuickSave}
          onSearch={handleSearch}
          tags={tags}
          recentSaves={recentSaves}
          isDarkMode={isDarkMode}
          onToggleDarkMode={onToggleDarkMode}
          onOpenSettings={onOpenSettings || handleGoToSettings}
          onOpenKeyboardShortcuts={onOpenKeyboardShortcuts}
        />
      )}

      {/* Main Content Area */}
      <main 
        className="main-content-area"
        style={{
          marginLeft: isMobile ? '0' : '280px',
          marginBottom: isMobile ? '64px' : '0',
          minHeight: '100vh'
        }}
      >
        {children}
      </main>

      {/* Mobile Bottom Navigation - hidden on desktop */}
      {isMobile && (
        <MobileBottomNav
          currentPage={currentPage}
          onNavigate={onNavigate}
          onAddClick={handleQuickSave}
        />
      )}

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={handleCommandPaletteClose}
        onNavigate={onNavigate}
        onQuickSave={handleQuickSave}
        onGoToSettings={handleGoToSettings}
        onSearch={handleSearch}
        documents={documents}
      />

      {/* Global Styles */}
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
        }

        .main-content-area {
          transition: margin-left 0.1s ease;
        }

        /* Responsive adjustments */
        @media (max-width: 900px) {
          .main-content-area {
            margin-left: 0 !important;
            padding-bottom: calc(var(--bottom-nav-height) + 20px);
          }
        }

        /* Ensure proper stacking */
        .app-layout {
          position: relative;
        }

        /* Sidebar z-index */
        .app-layout > aside {
          z-index: 100;
        }

        /* Mobile nav z-index */
        .app-layout > nav {
          z-index: 100;
        }
      `}</style>
    </div>
  );
}

export default Layout;
