import { useState, useEffect } from 'react';
import { documentAPI, contentAPI, searchAPI } from './services/api';
import './App.css';

function App() {
  const [documents, setDocuments] = useState([]);
  const [activeTab, setActiveTab] = useState('documents');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchModel, setSearchModel] = useState('bm25');
  const [isSearching, setIsSearching] = useState(false);
  
  // Form states
  const [urlInput, setUrlInput] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await documentAPI.getAll();
      setDocuments(response.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch documents');
    }
  };

  const handleURLSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      await contentAPI.createFromURL(urlInput);
      setSuccessMessage('Document created from URL successfully!');
      setUrlInput('');
      fetchDocuments();
      setActiveTab('documents');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch URL content');
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
      setSuccessMessage('Document created successfully!');
      setManualTitle('');
      setManualContent('');
      fetchDocuments();
      setActiveTab('documents');
    } catch {
      setError('Failed to create document');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setError(null);
    
    try {
      const response = await searchAPI.search(searchQuery, searchModel);
      setSearchResults(response.data.results || []);
    } catch (err) {
      setError('Search failed');
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccessMessage(null);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>SmartKeep</h1>
        <p className="subtitle">Your Personal Knowledge Management System</p>
      </header>

      <nav className="nav-tabs">
        <button 
          className={`tab ${activeTab === 'documents' ? 'active' : ''}`}
          onClick={() => { setActiveTab('documents'); clearMessages(); }}
        >
          Documents
        </button>
        <button 
          className={`tab ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => { setActiveTab('add'); clearMessages(); }}
        >
          Add Content
        </button>
        <button 
          className={`tab ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => { setActiveTab('search'); clearMessages(); }}
        >
          Search
        </button>
      </nav>

      <main className="main-content">
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

        {activeTab === 'documents' && (
          <div className="documents-view">
            <h2>Your Documents</h2>
            {documents.length === 0 ? (
              <div className="empty-state">
                <p>No documents yet.</p>
                <button onClick={() => setActiveTab('add')} className="btn primary">
                  Add your first document
                </button>
              </div>
            ) : (
              <div className="documents-grid">
                {documents.map((doc) => (
                  <div key={doc.id} className="document-card">
                    <h3>{doc.title}</h3>
                    <p className="document-content">
                      {doc.content.length > 150 
                        ? doc.content.substring(0, 150) + '...' 
                        : doc.content}
                    </p>
                    <div className="document-meta">
                      {doc.domain && <span className="domain">{doc.domain}</span>}
                      {doc.source_url && (
                        <a href={doc.source_url} target="_blank" rel="noopener noreferrer" className="source-link">
                          View Source
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'add' && (
          <div className="add-content-view">
            <h2>Add New Content</h2>
            
            <div className="add-options">
              <div className="add-option">
                <h3>From URL</h3>
                <form onSubmit={handleURLSubmit}>
                  <div className="form-group">
                    <label htmlFor="url">Enter URL:</label>
                    <input
                      type="url"
                      id="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://example.com/article"
                      required
                    />
                  </div>
                  <button type="submit" className="btn primary" disabled={isLoading}>
                    {isLoading ? 'Fetching...' : 'Fetch Content'}
                  </button>
                </form>
              </div>

              <div className="divider">OR</div>

              <div className="add-option">
                <h3>Manual Entry</h3>
                <form onSubmit={handleManualSubmit}>
                  <div className="form-group">
                    <label htmlFor="title">Title:</label>
                    <input
                      type="text"
                      id="title"
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      placeholder="Enter document title"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="content">Content:</label>
                    <textarea
                      id="content"
                      value={manualContent}
                      onChange={(e) => setManualContent(e.target.value)}
                      placeholder="Enter document content..."
                      rows={6}
                      required
                    />
                  </div>
                  <button type="submit" className="btn primary" disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Save Document'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'search' && (
          <div className="search-view">
            <h2>Search Documents</h2>
            
            <form onSubmit={handleSearch} className="search-form">
              <div className="search-input-group">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter search query..."
                  className="search-input"
                />
                <select 
                  value={searchModel} 
                  onChange={(e) => setSearchModel(e.target.value)}
                  className="model-select"
                >
                  <option value="bm25">BM25</option>
                  <option value="tfidf">TF-IDF</option>
                </select>
                <button type="submit" className="btn primary" disabled={isSearching}>
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>
            </form>

            {searchResults.length > 0 && (
              <div className="search-results">
                <h3>Results ({searchResults.length})</h3>
                {searchResults.map((result, index) => (
                  <div key={index} className="result-card">
                    <div className="result-header">
                      <h4>{result.title}</h4>
                      <span className="result-score">Score: {result.score?.toFixed(4)}</span>
                    </div>
                    <p className="result-content">{result.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
