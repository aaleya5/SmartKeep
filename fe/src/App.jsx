import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { documentAPI, contentAPI, collectionAPI } from './services/api';
import ErrorBoundary from './components/ErrorBoundary';
import Landing from './components/Landing';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Library from './components/Library';
import SearchPage from './components/SearchPage';
import ContentDetailPage from './components/ContentDetailPage';
import AddToCollectionModal from './components/AddToCollectionModal';
import CollectionsPage from './components/CollectionsPage';
import CollectionDetailPage from './components/CollectionDetailPage';
import ExplorePage from './components/ExplorePage';
import AnnotationsPage from './components/AnnotationsPage';
import InsightsPage from './components/InsightsPage';
import SettingsPage from './components/SettingsPage';
import QuickSaveModal from './components/QuickSaveModal';
import OfflineBanner from './components/common/OfflineBanner';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import './App.css';

function App() {
  // Current page/view state
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [currentPageParams, setCurrentPageParams] = useState(null);
  
  // Documents state
  const [documents, setDocuments] = useState([]);
  
  // Collections state
  const [collections, setCollections] = useState([]);
  
  // Tags state (extracted from documents)
  const [allTags, setAllTags] = useState([]);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const searchBarRef = useRef(null);
  
  // Collections state
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [currentCollectionDetail, setCurrentCollectionDetail] = useState(null);
  const [collectionsRefreshTrigger, setCollectionsRefreshTrigger] = useState(0);
  const [showAddToCollection, setShowAddToCollection] = useState(false);
  const [selectedDocumentForCollection, setSelectedDocumentForCollection] = useState(null);
  
  // Quick save modal state
  const [showQuickSave, setShowQuickSave] = useState(false);
  
  // Form states
  const [urlInput, setUrlInput] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Keyboard shortcuts
  useKeyboardShortcuts({
    's': () => setShowQuickSave(true),
    'f': () => {
      // Focus the search bar
      const searchInput = document.querySelector('input[type="search"], input[placeholder*="Search"]');
      if (searchInput) {
        searchInput.focus();
      } else {
        // Navigate to search page
        setCurrentPage('search');
      }
    },
  }, { enabled: true, ignoreInputKeys: [] });

  useEffect(() => {
    fetchDocuments();
    fetchCollections();
  }, []);
  
  const fetchCollections = async () => {
    try {
      const response = await collectionAPI.getAll(true, 'newest');
      // Backend returns { collections: [], total }
      setCollections(response.data.collections || []);
    } catch (err) {
      console.error('Failed to fetch collections:', err);
    }
  };
  


  const fetchDocuments = async (collectionId = null) => {
    setIsLoading(true);
    try {
      let response;
      if (collectionId) {
        // Use getContent to fetch documents in a collection
        response = await collectionAPI.getContent(collectionId);
        setDocuments(response.data.items || []);
      } else {
        response = await documentAPI.getAll();
        // Backend returns { items: [], total, page, page_size, has_next }
        const docs = response.data.items || [];
        setDocuments(docs);
        
        // Extract unique tags from all documents
        const tagsSet = new Set();
        docs.forEach(doc => {
          if (doc.suggested_tags && Array.isArray(doc.suggested_tags)) {
            doc.suggested_tags.forEach(tag => tagsSet.add(tag));
          }
        });
        setAllTags(Array.from(tagsSet));
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch documents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigate = (page, options = {}) => {
    setCurrentPage(page);
    setCurrentPageParams(options.selectedItem || null);
    clearMessages();
    
    // Refresh collections when navigating to library
    if (page === 'library') {
      fetchCollections();
    }
    
    // Handle navigation-specific logic
    if (options.filterTag) {
      // Filter by tag - could be implemented later
      console.log('Filter by tag:', options.filterTag);
    }
    if (options.selectedItem) {
      // Navigate to specific item - could be implemented later
      console.log('Selected item:', options.selectedItem);
    }
  };

  // Placeholder for collection selection (to be implemented)
  const _handleCollectionSelect = (collectionId) => {
    setSelectedCollection(collectionId);
    fetchDocuments(collectionId);
  };

  const handleAddToCollection = (docId) => {
    setSelectedDocumentForCollection(docId);
    setShowAddToCollection(true);
  };

  const handleURLSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      await contentAPI.createFromURL(urlInput);
      setSuccessMessage('Document created from URL successfully! AI enrichment will complete shortly.');
      setUrlInput('');
      fetchDocuments();
      setCurrentPage('documents');
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.response?.data?.message || 'Failed to fetch URL content';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      await contentAPI.createManual(manualTitle, manualContent);
      setSuccessMessage('Document created successfully! AI enrichment will complete shortly.');
      setManualTitle('');
      setManualContent('');
      fetchDocuments();
      setCurrentPage('documents');
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to create document';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick save handler
  const handleQuickSave = async (data) => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (data.url) {
        await contentAPI.createFromURL(data.url);
        setSuccessMessage('Document created from URL successfully!');
      } else if (data.title && data.content) {
        await contentAPI.createManual(data.title, data.content);
        setSuccessMessage('Document created successfully!');
      }
      fetchDocuments();
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.response?.data?.message || 'Failed to save';
      setError(errorMsg);
      throw err; // Re-throw so the modal knows it failed
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (query) => {
    if (!query.trim()) return;
    
    setSearchQuery(query);
    setCurrentPage('search');
  };

  const handleReEnrich = async (docId) => {
    try {
      await contentAPI.enrich(docId);
      setSuccessMessage('Enrichment triggered! This may take a moment.');
      fetchDocuments();
    } catch (err) {
      setError('Failed to trigger enrichment: ' + (err.response?.data?.detail || err.message));
    }
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    // Could save preference to backend here
  };

  const clearMessages = () => {
    setError(null);
    setSuccessMessage(null);
  };

  const getDifficultyBadge = (score) => {
    if (score === null || score === undefined) return null;
    
    let level, className;
    if (score >= 60) {
      level = 'Easy';
      className = 'badge-easy';
    } else if (score >= 30) {
      level = 'Intermediate';
      className = 'badge-intermediate';
    } else {
      level = 'Advanced';
      className = 'badge-advanced';
    }
    
    return <span className={`difficulty-badge ${className}`}>{level}</span>;
  };

  const getReadingTime = (minutes) => {
    if (minutes === null || minutes === undefined) return null;
    if (minutes < 1) return '< 1 min read';
    if (minutes === 1) return '1 min read';
    return `~${Math.round(minutes)} min read`;
  };

  const getEnrichmentStatus = (status) => {
    if (status === 'complete') {
      return <span className="enrichment-status complete">✓ Enriched</span>;
    } else if (status === 'processing') {
      return <span className="enrichment-status processing">⏳ Processing...</span>;
    } else if (status === 'failed') {
      return <span className="enrichment-status failed">⚠ Failed</span>;
    }
    return <span className="enrichment-status pending">⏳ Pending</span>;
  };

  // Determine which view to show based on currentPage
  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard
            documents={documents}
            onNavigate={handleNavigate}
            onSelectDocument={(doc) => console.log('Selected:', doc)}
          />
        );
      case 'library':
        return (
          <Library
            documents={documents}
            collections={collections}
            tags={allTags}
            onSelectDocument={(doc) => console.log('Selected:', doc)}
            onRefresh={fetchDocuments}
          />
        );
      case 'documents':
        return renderDocumentsView();
      case 'add':
        return renderAddView();
      case 'search':
        return <SearchPage initialQuery={searchQuery} />;
      case 'content-detail':
        return (
          <ContentDetailPage
            contentId={currentPageParams?.id || currentPageParams}
            onNavigate={handleNavigate}
            onDeleteDocument={(id) => {
              setDocuments(documents.filter(d => d.id !== id));
            }}
          />
        );
      case 'collections':
        return (
          <CollectionsPage
            onNavigate={handleNavigate}
            onSelectCollection={(collection) => {
              setCurrentCollectionDetail(collection);
            }}
            refreshTrigger={collectionsRefreshTrigger}
          />
        );
      case 'collection-detail':
        return (
          <CollectionDetailPage
            collection={currentPageParams?.collection || currentCollectionDetail}
            onNavigate={handleNavigate}
            onBack={() => {
              setCurrentCollectionDetail(null);
              setCurrentPage('collections');
              setCollectionsRefreshTrigger(t => t + 1);
            }}
          />
        );
      case 'explore':
        return <ExplorePage onNavigate={handleNavigate} />;
      case 'annotations':
        return (
          <AnnotationsPage
            onNavigate={handleNavigate}
          />
        );
      case 'insights':
        return <InsightsPage />;
      case 'settings':
        return <SettingsPage onThemeChange={(theme) => setIsDarkMode(theme === 'dark')} />;
      default:
        return renderDocumentsView();
    }
  };

  const renderDocumentsView = () => (
    <div className="documents-view">
      <div className="documents-layout">
        <h2>
          {selectedCollection ? 'Collection Documents' : 'All Documents'}
        </h2>
        {isLoading && (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <span>Loading documents...</span>
          </div>
        )}
        {documents.length === 0 && !isLoading ? (
          <div className="empty-state">
            <p>No documents yet.</p>
            <button onClick={() => setCurrentPage('add')} className="btn primary">
              Add your first document
            </button>
          </div>
        ) : (
          <div className="documents-grid">
            {documents.map((doc) => (
              <div key={doc.id} className="document-card">
                <h3>{doc.title}</h3>
                
                {/* AI Enrichment Info */}
                <div className="document-ai-info">
                  {getEnrichmentStatus(doc.enrichment_status)}
                  {doc.reading_time && (
                    <span className="reading-time">📖 {getReadingTime(doc.reading_time)}</span>
                  )}
                  {doc.difficulty_score && getDifficultyBadge(doc.difficulty_score)}
                </div>
                
                {/* Summary (if available) */}
                {doc.summary && (
                  <p className="document-summary">
                    <strong>Summary:</strong> {doc.summary}
                  </p>
                )}
                
                <p className="document-content">
                  {doc.content.length > 150 
                    ? doc.content.substring(0, 150) + '...' 
                    : doc.content}
                </p>
                
                {/* Suggested Tags */}
                {doc.suggested_tags && doc.suggested_tags.length > 0 && (
                  <div className="suggested-tags">
                    <strong>Suggested tags:</strong> 
                    {doc.suggested_tags.map((tag, idx) => (
                      <span key={idx} className="tag">{tag}</span>
                    ))}
                  </div>
                )}
                
                <div className="document-meta">
                  {doc.domain && <span className="domain">{doc.domain}</span>}
                  {doc.source_url && (
                    <a href={doc.source_url} target="_blank" rel="noopener noreferrer" className="source-link">
                      View Source
                    </a>
                  )}
                  <button 
                    className="add-to-collection-btn"
                    onClick={() => handleAddToCollection(doc.id)}
                    title="Add to collection"
                  >
                    📁
                  </button>
                  {doc.enrichment_status === 'failed' || doc.enrichment_status === 'pending' ? (
                    <button 
                      className="re-enrich-btn"
                      onClick={() => handleReEnrich(doc.id)}
                    >
                      Re-enrich
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderAddView = () => (
    <div className="add-content-view">
      <h2 style={{ borderBottom: '4px solid', paddingBottom: '1rem', marginBottom: '2rem', fontSize: '2.5rem' }}>INGEST CONTENT</h2>
      
      <div className="add-options">
        <div className="add-option config-panel">
          <h3 style={{ fontFamily: 'monospace', letterSpacing: '0.1em' }}>/// OUTBOUND FETCH</h3>
          <form onSubmit={handleURLSubmit}>
            <div className="form-group">
              <label htmlFor="url">TARGET_URL:</label>
              <input
                type="url"
                id="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://..."
                required
                disabled={isLoading}
                style={{ fontFamily: 'monospace', padding: '1.5rem', fontSize: '1.25rem' }}
              />
            </div>
            <button type="submit" className="btn primary" disabled={isLoading} style={{ width: '100%', padding: '1.5rem', fontSize: '1.25rem' }}>
              {isLoading ? <><span className="spinner-small"></span> EXECUTING...</> : 'INITIATE EXTRACTION'}
            </button>
          </form>
          <p className="form-hint" style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--text-color)', color: 'var(--bg-color)', fontWeight: 'bold' }}>
            &gt; Content will be pushed to the enrichment pipeline automatically.
          </p>
        </div>

        <div className="divider" style={{ opacity: 0 }}></div>

        <div className="add-option config-panel">
          <h3 style={{ fontFamily: 'monospace', letterSpacing: '0.1em' }}>/// DIRECT INPUT</h3>
          <form onSubmit={handleManualSubmit}>
            <div className="form-group">
              <label htmlFor="title">SYS.TITLE:</label>
              <input
                type="text"
                id="title"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder="IDENTIFIER..."
                required
                disabled={isLoading}
                style={{ fontFamily: 'monospace' }}
              />
            </div>
            <div className="form-group">
              <label htmlFor="content">RAW.PAYLOAD:</label>
              <textarea
                id="content"
                value={manualContent}
                onChange={(e) => setManualContent(e.target.value)}
                placeholder="CONTENT_BLOB..."
                rows={8}
                required
                disabled={isLoading}
                style={{ fontFamily: 'monospace' }}
              />
            </div>
            <button type="submit" className="btn primary" disabled={isLoading} style={{ width: '100%' }}>
              {isLoading ? <><span className="spinner-small"></span> COMMITTING...</> : 'COMMIT_RECORD'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Landing />} />
        
        <Route path="/app/*" element={
          <>
            {/* Offline Banner */}
            <OfflineBanner />
            
            <Layout
                currentPage={currentPage}
                onNavigate={handleNavigate}
                documents={documents}
                isDarkMode={isDarkMode}
                onToggleDarkMode={toggleDarkMode}
                onSearch={handleSearch}
                onOpenSettings={() => setCurrentPage('settings')}
            >
              <div className={`app ${isDarkMode ? 'dark-mode' : ''}`}>
                  {/* Keyboard shortcut hints */}
                  <div className="keyboard-hints">
                    <span><kbd>S</kbd> Quick Save</span>
                    <span><kbd>F</kbd> Search</span>
                  </div>
                  
                  {/* Alerts */}
                  {error && (
                    <div className="alert error">
                      {error}
                      <button onClick={() => setError(null)} className="close-btn">×</button>
                    </div>
                  )}
                  
                  {successMessage && (
                    <div className="alert success">
                      {successMessage}
                      <button onClick={() => setSuccessMessage(null)} className="close-btn">×</button>
                    </div>
                  )}

                {/* Main Content */}
                <div className="main-content">
                  {renderContent()}
                </div>
              </div>

                {/* Add to Collection Modal */}
              <AddToCollectionModal
                  isOpen={showAddToCollection}
                  onClose={() => {
                    setShowAddToCollection(false);
                    setSelectedDocumentForCollection(null);
                  }}
                  documentId={selectedDocumentForCollection}
                  documentTitle={documents.find(d => d.id === selectedDocumentForCollection)?.title}
                  onSuccess={() => {
                    fetchDocuments(selectedCollection);
                  }}
              />

              {/* Quick Save Modal */}
              <QuickSaveModal
                isOpen={showQuickSave}
                onClose={() => setShowQuickSave(false)}
                onSave={handleQuickSave}
              />
            </Layout>
          </>
        } />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
