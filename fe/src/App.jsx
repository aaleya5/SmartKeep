import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { authAPI, contentAPI, collectionAPI } from './services/api';
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
import AddContentView from './components/AddContentView';
import QuickSaveModal from './components/QuickSaveModal';
import OfflineBanner from './components/common/OfflineBanner';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import VerifyEmail from './components/VerifyEmail';
import ResetPassword from './components/ResetPassword';
import './App.css';

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  // Global App State
  const [documents, setDocuments] = useState([]);
  const [collections, setCollections] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Modals state
  const [showQuickSave, setShowQuickSave] = useState(false);
  const [showAddToCollection, setShowAddToCollection] = useState(false);
  const [selectedDocumentForCollection, setSelectedDocumentForCollection] = useState(null);
  
  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Check authentication on app load
  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('smartkeep_auth_token');
      if (token) {
        await authAPI.me();
        setIsAuthenticated(true);
        await Promise.all([fetchDocuments(), fetchCollections(), fetchTags()]);
      } else {
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      setIsAuthenticated(false);
      localStorage.removeItem('smartkeep_auth_token');
      localStorage.removeItem('smartkeep_user');
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('smartkeep_auth_token');
    localStorage.removeItem('smartkeep_user');
    setIsAuthenticated(false);
    setDocuments([]);
    setCollections([]);
    setAllTags([]);
    window.location.href = '/';
  };
  
  useEffect(() => {
    checkAuth();
  }, []);
  
  // Fetch global data
  const fetchCollections = async () => {
    try {
      const response = await collectionAPI.getAll(true, 'newest');
      setCollections(response.data.collections || []);
    } catch (err) {
      console.error('Failed to fetch collections:', err);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await contentAPI.getTags();
      setAllTags(response.data || []);
    } catch (err) {
      console.error('Failed to fetch tags:', err);
    }
  };

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await contentAPI.getList();
      const docs = response.data.items || [];
      setDocuments(docs);
      
      // Extract unique tags logic moved to fetchTags() for better performance
      fetchTags();
    } catch (err) {
      console.error(err);
      setError('Failed to fetch documents');
    } finally {
      setIsLoading(false);
    }
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    's': () => setShowQuickSave(true),
    'f': () => {
      const searchInput = document.querySelector('input[type="search"], input[placeholder*="Search"]');
      if (searchInput) {
        searchInput.focus();
      } else {
        navigate('/app/search');
      }
    },
  }, { enabled: true, ignoreInputKeys: [] });

  const handleQuickSave = async (data) => {
    setIsLoading(true);
    setError(null);
    try {
      if (data.url) {
        await contentAPI.createFromURL(data.url);
      } else if (data.title && data.content) {
        await contentAPI.createManual(data.title, data.content);
      }
      await fetchDocuments();
      setShowQuickSave(false);
      navigate('/app/library');
      setSuccessMessage('Document saved!');
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : (detail?.message || err.message));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="auth-loading">
        <div className="spinner"></div>
        <span>Initializing...</span>
      </div>
    );
  }

  const AppRoutes = () => (
    <Routes>
      <Route index element={<Dashboard documents={documents} />} />
      <Route path="library" element={
        <Library 
          documents={documents} 
          collections={collections} 
          tags={allTags} 
          onRefresh={fetchDocuments}
          onSelectDocument={(doc) => navigate(`/app/content/${doc.id}`)}
          onAddToCollection={(docId) => {
            setSelectedDocumentForCollection(docId);
            setShowAddToCollection(true);
          }}
        />
      } />
      <Route path="search" element={<SearchPage />} />
      <Route path="add" element={
        <AddContentView 
          onAddSuccess={(msg) => {
            setSuccessMessage(msg);
            fetchDocuments();
            navigate('/app/library');
          }}
          onError={setError}
          isLoading={isLoading}
        />
      } />
      <Route path="content/:id" element={
        <ContentDetailPage 
          onDeleteDocument={(id) => {
            setDocuments(docs => docs.filter(d => d.id !== id));
            navigate('/app/library');
          }}
        />
      } />
      <Route path="collections" element={
        <CollectionsPage
          onNavigate={(view, params) => {
            if (view === 'collection-detail' && params?.collection?.id) {
              navigate(`/app/collections/${params.collection.id}`);
            }
          }}
        />
      } />
      <Route path="collections/:id" element={<CollectionDetailPage />} />
      <Route path="explore" element={<ExplorePage />} />
      <Route path="annotations" element={<AnnotationsPage />} />
      <Route path="insights" element={<InsightsPage />} />
      <Route path="settings" element={<SettingsPage onThemeChange={(theme) => setIsDarkMode(theme === 'dark')} />} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={isAuthenticated ? <Navigate to="/app" replace /> : <Landing />} />
        
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/login" element={isAuthenticated ? <Navigate to="/app" replace /> : <Landing forceLogin={true} />} />
        
        <Route path="/app/*" element={
          !isAuthenticated ? <Navigate to="/" replace /> : (
          <>
            <OfflineBanner />
            <Layout
                isDarkMode={isDarkMode}
                onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
                documents={documents}
                tags={allTags}
                onLogout={handleLogout}
            >
              <div className={`app-container ${isDarkMode ? 'dark-mode' : ''}`}>
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

                <div className="main-content">
                  <AppRoutes />
                </div>
              </div>

              <AddToCollectionModal
                  isOpen={showAddToCollection}
                  onClose={() => setShowAddToCollection(false)}
                  documentId={selectedDocumentForCollection}
                  onSuccess={() => fetchDocuments()}
              />

              <QuickSaveModal
                isOpen={showQuickSave}
                onClose={() => setShowQuickSave(false)}
                onSave={handleQuickSave}
              />
            </Layout>
          </>
          )
        } />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
