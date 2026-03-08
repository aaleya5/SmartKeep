import { useState, useEffect } from 'react';
import { contentAPI, collectionAPI, searchAPI } from '../services/api';

// Progress bar component
function ProgressBar({ currentStep, totalSteps }) {
  const progress = ((currentStep + 1) / totalSteps) * 100;
  
  return (
    <div className="onboarding-progress-bar">
      <div className="onboarding-progress-fill" style={{ width: `${progress}%` }}></div>
      <div className="onboarding-progress-steps">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div 
            key={i} 
            className={`onboarding-progress-step ${i <= currentStep ? 'active' : ''} ${i < currentStep ? 'completed' : ''}`}
          >
            <span className="step-number">{i + 1}</span>
          </div>
        ))}
      </div>
      <style>{`
        .onboarding-progress-bar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          background: var(--sidebar-bg, #fff);
          padding: 12px 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        
        .onboarding-progress-fill {
          position: absolute;
          top: 0;
          left: 0;
          height: 3px;
          background: linear-gradient(90deg, #667eea, #00C9A7);
          transition: width 0.4s ease;
        }
        
        .onboarding-progress-steps {
          display: flex;
          justify-content: center;
          gap: 32px;
        }
        
        .onboarding-progress-step {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-secondary, #6b7280);
          font-size: 14px;
        }
        
        .onboarding-progress-step .step-number {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--hover-bg, #f3f4f6);
          font-weight: 600;
          font-size: 12px;
          transition: all 0.3s ease;
        }
        
        .onboarding-progress-step.active {
          color: #667eea;
        }
        
        .onboarding-progress-step.active .step-number {
          background: #667eea;
          color: white;
        }
        
        .onboarding-progress-step.completed .step-number {
          background: #00C9A7;
          color: white;
        }
        
        .dark-mode .onboarding-progress-bar {
          background: #1f2937;
        }
        
        .dark-mode .onboarding-progress-step {
          color: #9ca3af;
        }
        
        .dark-mode .onboarding-progress-step .step-number {
          background: #374151;
        }
      `}</style>
    </div>
  );
}

// Step 1: Welcome Screen
function WelcomeScreen({ onNext }) {
  const [animationPhase, setAnimationPhase] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationPhase(prev => (prev + 1) % 4);
    }, 1500);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="onboarding-step welcome-screen">
      <div className="welcome-content">
        <div className="welcome-animation">
          <div className="demo-container">
            {/* Animated Demo */}
            <div className="demo-browser">
              <div className="browser-bar">
                <span className="browser-dot"></span>
                <span className="browser-dot"></span>
                <span className="browser-dot"></span>
              </div>
              <div className="browser-content">
                <div className={`demo-url-bar ${animationPhase >= 1 ? 'active' : ''}`}>
                  <span className="url-icon">🔗</span>
                  <span className="url-text">https://example.com/article</span>
                </div>
                <div className={`demo-save-btn ${animationPhase >= 1 ? 'active' : ''}`}>
                  Save to SmartKeep
                </div>
                <div className={`demo-card ${animationPhase >= 2 ? 'visible' : ''}`}>
                  <div className="card-icon">📄</div>
                  <div className="card-content">
                    <div className="card-title">Article Title</div>
                    <div className={`card-summary ${animationPhase >= 3 ? 'visible' : ''}`}>
                      <span className="summary-label">AI Summary:</span>
                      <span className="summary-text">This is a brief summary of the article content...</span>
                    </div>
                    <div className="card-tags">
                      <span className="tag">Technology</span>
                      <span className="tag">AI</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <h1 className="welcome-title">Welcome to SmartKeep</h1>
          <p className="welcome-subtitle">
            Your intelligent second brain for saving and organizing web content with AI-powered summaries and semantic search.
          </p>
          
          <button className="btn primary btn-large" onClick={onNext}>
            Let's set up SmartKeep
            <span className="btn-arrow">→</span>
          </button>
        </div>
      </div>
      
      <style>{`
        .onboarding-step {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 24px;
          text-align: center;
        }
        
        .welcome-content {
          max-width: 600px;
        }
        
        .welcome-animation {
          margin-bottom: 40px;
        }
        
        .demo-container {
          margin-bottom: 40px;
        }
        
        .demo-browser {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15);
          overflow: hidden;
          max-width: 450px;
          margin: 0 auto;
        }
        
        .browser-bar {
          background: #f1f5f9;
          padding: 12px 16px;
          display: flex;
          gap: 8px;
        }
        
        .browser-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #cbd5e1;
        }
        
        .browser-dot:first-child { background: #ef4444; }
        .browser-dot:nth-child(2) { background: #f59e0b; }
        .browser-dot:nth-child(3) { background: #22c55e; }
        
        .browser-content {
          padding: 20px;
          background: #f8fafc;
          min-height: 200px;
        }
        
        .demo-url-bar {
          background: #fff;
          border: 2px dashed #e2e8f0;
          border-radius: 8px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          opacity: 0.5;
          transition: all 0.5s ease;
        }
        
        .demo-url-bar.active {
          border-color: #667eea;
          border-style: solid;
          opacity: 1;
        }
        
        .url-icon { font-size: 16px; }
        .url-text { color: #64748b; font-size: 14px; }
        
        .demo-save-btn {
          background: #667eea;
          color: white;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          display: inline-block;
          opacity: 0;
          transform: translateY(10px);
          transition: all 0.5s ease;
        }
        
        .demo-save-btn.active {
          opacity: 1;
          transform: translateY(0);
        }
        
        .demo-card {
          background: white;
          border-radius: 12px;
          padding: 16px;
          margin-top: 16px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          display: flex;
          gap: 12px;
          opacity: 0;
          transform: translateY(20px) scale(0.95);
          transition: all 0.5s ease;
        }
        
        .demo-card.visible {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        
        .card-icon {
          font-size: 32px;
        }
        
        .card-content {
          flex: 1;
        }
        
        .card-title {
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 8px;
        }
        
        .card-summary {
          font-size: 13px;
          color: #64748b;
          margin-bottom: 8px;
          opacity: 0;
          transition: opacity 0.5s ease 0.3s;
        }
        
        .card-summary.visible {
          opacity: 1;
        }
        
        .summary-label {
          font-weight: 600;
          color: #00C9A7;
        }
        
        .card-tags {
          display: flex;
          gap: 6px;
        }
        
        .card-tags .tag {
          background: #e0e7ff;
          color: #667eea;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
        }
        
        .welcome-title {
          font-size: 36px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 16px;
        }
        
        .welcome-subtitle {
          font-size: 18px;
          color: #64748b;
          line-height: 1.6;
          margin-bottom: 32px;
        }
        
        .btn-large {
          padding: 16px 32px;
          font-size: 18px;
          display: inline-flex;
          align-items: center;
          gap: 12px;
        }
        
        .btn-arrow {
          transition: transform 0.3s ease;
        }
        
        .btn-large:hover .btn-arrow {
          transform: translateX(4px);
        }
        
        .dark-mode .demo-browser {
          background: #1e293b;
        }
        
        .dark-mode .browser-bar {
          background: #0f172a;
        }
        
        .dark-mode .browser-content {
          background: #1e2937;
        }
        
        .dark-mode .demo-url-bar {
          background: #374151;
          border-color: #4b5563;
        }
        
        .dark-mode .url-text {
          color: #9ca3af;
        }
        
        .dark-mode .demo-card {
          background: #374151;
        }
        
        .dark-mode .card-title {
          color: #f1f5f9;
        }
        
        .dark-mode .card-summary {
          color: #9ca3af;
        }
        
        .dark-mode .welcome-title {
          color: #f1f5f9;
        }
        
        .dark-mode .welcome-subtitle {
          color: #9ca3af;
        }
      `}</style>
    </div>
  );
}

// Step 2: Save First Item
function SaveFirstItem({ onNext, onDocumentCreated }) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [savedDoc, setSavedDoc] = useState(null);
  const [error, setError] = useState(null);
  
  const exampleUrls = [
    { url: 'https://example.com/intro', title: 'Getting Started Guide', domain: 'example.com' },
    { url: 'https://example.com/features', title: 'SmartKeep Features Overview', domain: 'example.com' },
    { url: 'https://example.com/tips', title: 'Pro Tips & Tricks', domain: 'example.com' },
  ];
  
  const handleSave = async (urlToSave = url) => {
    if (!urlToSave.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await contentAPI.createFromURL(urlToSave);
      const newDoc = response.data;
      setSavedDoc(newDoc);
      onDocumentCreated(newDoc);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.response?.data?.message || 'Failed to save URL';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleExampleClick = (exampleUrl) => {
    setUrl(exampleUrl);
    handleSave(exampleUrl);
  };
  
  const handleContinue = () => {
    if (savedDoc) {
      onNext();
    }
  };
  
  return (
    <div className="onboarding-step save-first-item">
      <div className="step-content">
        <div className="step-header">
          <span className="step-badge">Step 2 of 5</span>
          <h2>Save your first item</h2>
          <p>Try saving a URL to see SmartKeep in action</p>
        </div>
        
        {!savedDoc ? (
          <>
            <div className="url-input-container">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste a URL here..."
                className="url-input"
                disabled={isLoading}
              />
              <button 
                className="btn primary" 
                onClick={() => handleSave()}
                disabled={isLoading || !url.trim()}
              >
                {isLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            <div className="example-urls">
              <p className="example-label">Or try one of these examples:</p>
              <div className="example-list">
                {exampleUrls.map((example, idx) => (
                  <button
                    key={idx}
                    className="example-url-btn"
                    onClick={() => handleExampleClick(example.url)}
                    disabled={isLoading}
                  >
                    <span className="example-icon">📄</span>
                    <div className="example-info">
                      <span className="example-title">{example.title}</span>
                      <span className="example-domain">{example.domain}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="saved-document-preview">
            <div className="success-message">
              ✓ Saved successfully!
            </div>
            <div className="document-card-demo">
              <div className="doc-icon">📄</div>
              <div className="doc-details">
                <h3>{savedDoc.title || 'Untitled'}</h3>
                <p className="doc-url">{savedDoc.source_url}</p>
                <div className="doc-status">
                  <span className="status-badge processing">⏳ Processing AI summary...</span>
                </div>
              </div>
            </div>
            <p className="hint-text">
              The AI summary will appear here once processing is complete.
            </p>
            <button className="btn primary btn-large" onClick={handleContinue}>
              Continue
              <span className="btn-arrow">→</span>
            </button>
          </div>
        )}
      </div>
      
      <style>{`
        .save-first-item {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 80px 24px;
        }
        
        .step-content {
          max-width: 500px;
          width: 100%;
        }
        
        .step-header {
          text-align: center;
          margin-bottom: 32px;
        }
        
        .step-badge {
          display: inline-block;
          background: #e0e7ff;
          color: #667eea;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 16px;
        }
        
        .step-header h2 {
          font-size: 28px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 8px;
        }
        
        .step-header p {
          font-size: 16px;
          color: #64748b;
        }
        
        .url-input-container {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }
        
        .url-input {
          flex: 1;
          padding: 14px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          font-size: 16px;
          transition: border-color 0.2s;
        }
        
        .url-input:focus {
          outline: none;
          border-color: #667eea;
        }
        
        .error-message {
          background: #fef2f2;
          color: #dc2626;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 14px;
        }
        
        .example-urls {
          margin-top: 24px;
        }
        
        .example-label {
          font-size: 14px;
          color: #64748b;
          margin-bottom: 12px;
        }
        
        .example-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .example-url-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }
        
        .example-url-btn:hover {
          border-color: #667eea;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
        }
        
        .example-icon {
          font-size: 24px;
        }
        
        .example-info {
          display: flex;
          flex-direction: column;
        }
        
        .example-title {
          font-weight: 600;
          color: #1e293b;
          font-size: 14px;
        }
        
        .example-domain {
          font-size: 12px;
          color: #64748b;
        }
        
        .saved-document-preview {
          text-align: center;
        }
        
        .success-message {
          color: #00C9A7;
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 24px;
        }
        
        .document-card-demo {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          gap: 16px;
          text-align: left;
          margin-bottom: 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        
        .doc-icon {
          font-size: 40px;
        }
        
        .doc-details h3 {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 4px;
        }
        
        .doc-url {
          font-size: 13px;
          color: #64748b;
          margin-bottom: 8px;
          word-break: break-all;
        }
        
        .status-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }
        
        .status-badge.processing {
          background: #fef3c7;
          color: #d97706;
        }
        
        .hint-text {
          font-size: 14px;
          color: #64748b;
          margin-bottom: 24px;
        }
        
        .btn-large {
          padding: 14px 28px;
          font-size: 16px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        
        .dark-mode .step-badge {
          background: #3730a3;
          color: #a5b4fc;
        }
        
        .dark-mode .step-header h2 {
          color: #f1f5f9;
        }
        
        .dark-mode .step-header p {
          color: #9ca3af;
        }
        
        .dark-mode .url-input {
          background: #374151;
          border-color: #4b5563;
          color: #f1f5f9;
        }
        
        .dark-mode .example-url-btn {
          background: #1f2937;
          border-color: #374151;
        }
        
        .dark-mode .example-title {
          color: #f1f5f9;
        }
        
        .dark-mode .document-card-demo {
          background: #1f2937;
          border-color: #374151;
        }
        
        .dark-mode .doc-details h3 {
          color: #f1f5f9;
        }
      `}</style>
    </div>
  );
}

// Step 3: Create First Collection
function CreateFirstCollection({ onNext, savedDocument }) {
  const [collectionName, setCollectionName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [created, setCreated] = useState(false);
  const [error, setError] = useState(null);
  
  const suggestedNames = ['Reading List', 'Work Articles', 'Research', 'Favorites'];
  
  const handleCreate = async () => {
    if (!collectionName.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Create collection
      const response = await collectionAPI.create(collectionName, '', '#667eea');
      const collection = response.data;
      
      // Add document to collection if we have one
      if (savedDocument?.id) {
        await collectionAPI.addDocuments(collection.id, [savedDocument.id]);
      }
      
      setCreated(true);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.response?.data?.message || 'Failed to create collection';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSuggestedClick = (name) => {
    setCollectionName(name);
  };
  
  const handleContinue = () => {
    onNext();
  };
  
  return (
    <div className="onboarding-step create-first-collection">
      <div className="step-content">
        <div className="step-header">
          <span className="step-badge">Step 3 of 5</span>
          <h2>Create your first collection</h2>
          <p>Organize your saved items into collections for better management</p>
        </div>
        
        {!created ? (
          <>
            <div className="collection-input-container">
              <input
                type="text"
                value={collectionName}
                onChange={(e) => setCollectionName(e.target.value)}
                placeholder="Enter collection name..."
                className="collection-input"
                disabled={isLoading}
              />
              <button 
                className="btn primary" 
                onClick={handleCreate}
                disabled={isLoading || !collectionName.trim()}
              >
                {isLoading ? 'Creating...' : 'Create'}
              </button>
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            <div className="suggested-collections">
              <p className="suggested-label">Suggested names:</p>
              <div className="suggested-list">
                {suggestedNames.map((name, idx) => (
                  <button
                    key={idx}
                    className="suggested-btn"
                    onClick={() => handleSuggestedClick(name)}
                    disabled={isLoading}
                  >
                    📁 {name}
                  </button>
                ))}
              </div>
            </div>
            
            {savedDocument && (
              <div className="add-to-collection-info">
                <span className="info-icon">💡</span>
                <span>We'll add your saved item to this collection</span>
              </div>
            )}
          </>
        ) : (
          <div className="created-collection-preview">
            <div className="success-message">
              ✓ Collection created!
            </div>
            <div className="collection-card-demo">
              <div className="collection-icon">📁</div>
              <div className="collection-details">
                <h3>{collectionName}</h3>
                <p className="collection-count">
                  {savedDocument ? '1 item' : '0 items'}
                </p>
              </div>
            </div>
            {savedDocument && (
              <p className="added-message">
                ✓ "{savedDocument.title || 'Untitled'}" added to collection
              </p>
            )}
            <button className="btn primary btn-large" onClick={handleContinue}>
              Continue
              <span className="btn-arrow">→</span>
            </button>
          </div>
        )}
      </div>
      
      <style>{`
        .create-first-collection {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 80px 24px;
        }
        
        .step-content {
          max-width: 500px;
          width: 100%;
        }
        
        .step-header {
          text-align: center;
          margin-bottom: 32px;
        }
        
        .step-badge {
          display: inline-block;
          background: #e0e7ff;
          color: #667eea;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 16px;
        }
        
        .step-header h2 {
          font-size: 28px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 8px;
        }
        
        .step-header p {
          font-size: 16px;
          color: #64748b;
        }
        
        .collection-input-container {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }
        
        .collection-input {
          flex: 1;
          padding: 14px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          font-size: 16px;
          transition: border-color 0.2s;
        }
        
        .collection-input:focus {
          outline: none;
          border-color: #667eea;
        }
        
        .error-message {
          background: #fef2f2;
          color: #dc2626;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 14px;
        }
        
        .suggested-collections {
          margin-top: 24px;
        }
        
        .suggested-label {
          font-size: 14px;
          color: #64748b;
          margin-bottom: 12px;
        }
        
        .suggested-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .suggested-btn {
          padding: 8px 16px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .suggested-btn:hover {
          border-color: #667eea;
          background: #f5f3ff;
        }
        
        .add-to-collection-info {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 24px;
          padding: 12px 16px;
          background: #f0fdf4;
          border-radius: 8px;
          font-size: 14px;
          color: #166534;
        }
        
        .created-collection-preview {
          text-align: center;
        }
        
        .success-message {
          color: #00C9A7;
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 24px;
        }
        
        .collection-card-demo {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          text-align: left;
          margin-bottom: 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        
        .collection-icon {
          font-size: 40px;
        }
        
        .collection-details h3 {
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 4px;
        }
        
        .collection-count {
          font-size: 14px;
          color: #64748b;
        }
        
        .added-message {
          font-size: 14px;
          color: #00C9A7;
          margin-bottom: 24px;
        }
        
        .btn-large {
          padding: 14px 28px;
          font-size: 16px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        
        .dark-mode .step-badge {
          background: #3730a3;
          color: #a5b4fc;
        }
        
        .dark-mode .step-header h2 {
          color: #f1f5f9;
        }
        
        .dark-mode .step-header p {
          color: #9ca3af;
        }
        
        .dark-mode .collection-input {
          background: #374151;
          border-color: #4b5563;
          color: #f1f5f9;
        }
        
        .dark-mode .suggested-btn {
          background: #1f2937;
          border-color: #374151;
          color: #f1f5f9;
        }
        
        .dark-mode .add-to-collection-info {
          background: #14532d;
          color: #86efac;
        }
        
        .dark-mode .collection-card-demo {
          background: #1f2937;
          border-color: #374151;
        }
        
        .dark-mode .collection-details h3 {
          color: #f1f5f9;
        }
      `}</style>
    </div>
  );
}

// Step 4: Try Search
function TrySearch({ onNext, savedDocument }) {
  const [query, setQuery] = useState('');
  const [keywordResults, setKeywordResults] = useState([]);
  const [semanticResults, setSemanticResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Pre-fill query based on saved document
  useEffect(() => {
    if (savedDocument?.title) {
      // Extract key terms from title for search
      const terms = savedDocument.title.split(' ').slice(0, 3).join(' ');
      setQuery(terms);
    }
  }, [savedDocument]);
  
  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    setHasSearched(true);
    
    try {
      // Keyword search (BM25)
      const keywordRes = await searchAPI.search(query, 'keyword', { limit: 3 });
      setKeywordResults(keywordRes.data.results || []);
      
      // Semantic search
      const semanticRes = await searchAPI.search(query, 'semantic', { limit: 3 });
      setSemanticResults(semanticRes.data.results || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };
  
  const handleContinue = () => {
    onNext();
  };
  
  return (
    <div className="onboarding-step try-search">
      <div className="step-content">
        <div className="step-header">
          <span className="step-badge">Step 4 of 5</span>
          <h2>Try semantic search</h2>
          <p>Experience the power of AI-powered search that understands meaning</p>
        </div>
        
        <div className="search-demo">
          <div className="search-input-container">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your saved content..."
              className="search-input"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button 
              className="btn primary" 
              onClick={handleSearch}
              disabled={isSearching || !query.trim()}
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
          
          {hasSearched && (
            <div className="search-results-comparison">
              <div className="results-column keyword">
                <h4>
                  <span className="method-icon">🔍</span>
                  Keyword Search
                </h4>
                <p className="method-desc">Finds exact matches</p>
                {keywordResults.length > 0 ? (
                  <ul className="results-list">
                    {keywordResults.map((result, idx) => (
                      <li key={idx} className="result-item">
                        {result.title || result.content?.substring(0, 50)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="no-results">No exact matches found</p>
                )}
              </div>
              
              <div className="results-column semantic">
                <h4>
                  <span className="method-icon">🧠</span>
                  Semantic Search
                </h4>
                <p className="method-desc">Understands meaning & context</p>
                {semanticResults.length > 0 ? (
                  <ul className="results-list">
                    {semanticResults.map((result, idx) => (
                      <li key={idx} className="result-item">
                        {result.title || result.content?.substring(0, 50)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="no-results">No semantic matches found</p>
                )}
              </div>
            </div>
          )}
          
          {!hasSearched && (
            <div className="search-demo-hint">
              <p>Try searching for related concepts - semantic search will find content even without exact keyword matches!</p>
            </div>
          )}
        </div>
        
        <button className="btn primary btn-large" onClick={handleContinue}>
          Continue
          <span className="btn-arrow">→</span>
        </button>
      </div>
      
      <style>{`
        .try-search {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 24px;
        }
        
        .step-content {
          max-width: 700px;
          width: 100%;
        }
        
        .step-header {
          text-align: center;
          margin-bottom: 32px;
        }
        
        .step-badge {
          display: inline-block;
          background: #e0e7ff;
          color: #667eea;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 16px;
        }
        
        .step-header h2 {
          font-size: 28px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 8px;
        }
        
        .step-header p {
          font-size: 16px;
          color: #64748b;
        }
        
        .search-demo {
          margin-bottom: 32px;
        }
        
        .search-input-container {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
        }
        
        .search-input {
          flex: 1;
          padding: 14px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          font-size: 16px;
          transition: border-color 0.2s;
        }
        
        .search-input:focus {
          outline: none;
          border-color: #667eea;
        }
        
        .search-results-comparison {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        
        .results-column {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
        }
        
        .results-column h4 {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 4px;
        }
        
        .method-icon {
          font-size: 20px;
        }
        
        .method-desc {
          font-size: 13px;
          color: #64748b;
          margin-bottom: 16px;
        }
        
        .results-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .result-item {
          padding: 10px 12px;
          background: #f8fafc;
          border-radius: 8px;
          margin-bottom: 8px;
          font-size: 14px;
          color: #1e293b;
        }
        
        .no-results {
          font-size: 14px;
          color: #94a3b8;
          font-style: italic;
        }
        
        .semantic {
          border-color: #00C9A7;
          background: #f0fdfa;
        }
        
        .semantic .method-desc {
          color: #0d9488;
        }
        
        .search-demo-hint {
          padding: 20px;
          background: #f0f9ff;
          border-radius: 12px;
          text-align: center;
        }
        
        .search-demo-hint p {
          color: #0369a1;
          font-size: 14px;
        }
        
        .btn-large {
          padding: 14px 28px;
          font-size: 16px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 24px;
        }
        
        .dark-mode .step-badge {
          background: #3730a3;
          color: #a5b4fc;
        }
        
        .dark-mode .step-header h2 {
          color: #f1f5f9;
        }
        
        .dark-mode .step-header p {
          color: #9ca3af;
        }
        
        .dark-mode .search-input {
          background: #374151;
          border-color: #4b5563;
          color: #f1f5f9;
        }
        
        .dark-mode .results-column {
          background: #1f2937;
          border-color: #374151;
        }
        
        .dark-mode .results-column h4 {
          color: #f1f5f9;
        }
        
        .dark-mode .method-desc {
          color: #9ca3af;
        }
        
        .dark-mode .result-item {
          background: #374151;
          color: #f1f5f9;
        }
        
        .dark-mode .semantic {
          background: #042f2e;
          border-color: #0d9488;
        }
        
        .dark-mode .search-demo-hint {
          background: #164e63;
        }
        
        .dark-mode .search-demo-hint p {
          color: #7dd3fc;
        }
      `}</style>
    </div>
  );
}

// Step 5: Install Bookmarklet
function InstallBookmarklet({ onComplete }) {
  const [isDragging, setIsDragging] = useState(false);
  
  const bookmarkletCode = `javascript:(function(){
    var url=window.location.href;
    window.open('${window.location.origin}/add?url='+encodeURIComponent(url),'_blank');
  })();`;
  
  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', bookmarkletCode);
    setIsDragging(true);
  };
  
  const handleDragEnd = () => {
    setIsDragging(false);
  };
  
  const handleSkip = () => {
    // Mark onboarding as complete
    localStorage.setItem('smartkeep_onboarding_complete', 'true');
    onComplete();
  };
  
  const handleComplete = () => {
    localStorage.setItem('smartkeep_onboarding_complete', 'true');
    onComplete();
  };
  
  return (
    <div className="onboarding-step install-bookmarklet">
      <div className="step-content">
        <div className="step-header">
          <span className="step-badge">Step 5 of 5</span>
          <h2>Install bookmarklet (optional)</h2>
          <p>Save pages with one click from your browser's bookmark bar</p>
        </div>
        
        <div className="bookmarklet-demo">
          <div className="install-instructions">
            <div className="instruction-step">
              <span className="step-num">1</span>
              <span>Drag this button to your bookmarks bar:</span>
            </div>
            
            <div 
              className={`bookmarklet-button ${isDragging ? 'dragging' : ''}`}
              draggable="true"
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <span className="bookmarklet-icon">⭐</span>
              <span className="bookmarklet-text">Save to SmartKeep</span>
            </div>
            
            <div className="instruction-step">
              <span className="step-num">2</span>
              <span>Visit any webpage and click the bookmark to save it!</span>
            </div>
          </div>
          
          <div className="demo-animation">
            <div className="browser-demo">
              <div className="browser-bar">
                <span className="browser-dot"></span>
                <span className="browser-dot"></span>
                <span className="browser-dot"></span>
                <div className="bookmarks-bar">
                  <span className="bookmark-item">⭐ Save to SmartKeep</span>
                </div>
              </div>
              <div className="browser-page">
                <div className="page-content">
                  <div className="page-title">Example Article</div>
                  <div className="page-lines">
                    <div className="line"></div>
                    <div className="line short"></div>
                    <div className="line"></div>
                    <div className="line medium"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="alt-instructions">
            <h4>Can't drag and drop?</h4>
            <p>Right-click your bookmarks bar → "Add page" → Name it "Save to SmartKeep" → Paste this in the URL:</p>
            <code className="bookmarklet-code">{bookmarkletCode}</code>
          </div>
        </div>
        
        <div className="action-buttons">
          <button className="btn secondary" onClick={handleSkip}>
            Skip for now
          </button>
          <button className="btn primary" onClick={handleComplete}>
            Finish setup
          </button>
        </div>
      </div>
      
      <style>{`
        .install-bookmarklet {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 24px;
        }
        
        .step-content {
          max-width: 600px;
          width: 100%;
        }
        
        .step-header {
          text-align: center;
          margin-bottom: 32px;
        }
        
        .step-badge {
          display: inline-block;
          background: #e0e7ff;
          color: #667eea;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 16px;
        }
        
        .step-header h2 {
          font-size: 28px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 8px;
        }
        
        .step-header p {
          font-size: 16px;
          color: #64748b;
        }
        
        .bookmarklet-demo {
          margin-bottom: 32px;
        }
        
        .install-instructions {
          text-align: center;
          margin-bottom: 32px;
        }
        
        .instruction-step {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 16px;
          font-size: 15px;
          color: #64748b;
        }
        
        .step-num {
          width: 28px;
          height: 28px;
          background: #667eea;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
        }
        
        .bookmarklet-button {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 14px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 30px;
          font-size: 16px;
          font-weight: 600;
          cursor: grab;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
          transition: all 0.3s ease;
          margin: 16px 0;
        }
        
        .bookmarklet-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
        }
        
        .bookmarklet-button.dragging {
          opacity: 0.5;
          cursor: grabbing;
        }
        
        .bookmarklet-icon {
          font-size: 20px;
        }
        
        .demo-animation {
          margin: 32px 0;
        }
        
        .browser-demo {
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.15);
          overflow: hidden;
          max-width: 450px;
          margin: 0 auto;
        }
        
        .browser-bar {
          background: #f1f5f9;
          padding: 10px 16px;
          display: flex;
          gap: 8px;
          align-items: center;
        }
        
        .browser-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #cbd5e1;
        }
        
        .browser-dot:first-child { background: #ef4444; }
        .browser-dot:nth-child(2) { background: #f59e0b; }
        .browser-dot:nth-child(3) { background: #22c55e; }
        
        .bookmarks-bar {
          margin-left: 20px;
          padding: 4px 12px;
          background: #e2e8f0;
          border-radius: 4px;
          font-size: 12px;
        }
        
        .bookmark-item {
          color: #64748b;
        }
        
        .browser-page {
          padding: 30px;
          background: #f8fafc;
          min-height: 150px;
        }
        
        .page-title {
          font-size: 24px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 20px;
        }
        
        .page-lines {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .line {
          height: 12px;
          background: #e2e8f0;
          border-radius: 6px;
        }
        
        .line.short { width: 60%; }
        .line.medium { width: 80%; }
        
        .alt-instructions {
          background: #f8fafc;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
        }
        
        .alt-instructions h4 {
          font-size: 15px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 8px;
        }
        
        .alt-instructions p {
          font-size: 14px;
          color: #64748b;
          margin-bottom: 12px;
        }
        
        .bookmarklet-code {
          display: block;
          padding: 12px;
          background: #1e293b;
          color: #a5b4fc;
          border-radius: 8px;
          font-size: 11px;
          word-break: break-all;
          text-align: left;
          max-height: 80px;
          overflow-y: auto;
        }
        
        .action-buttons {
          display: flex;
          justify-content: center;
          gap: 16px;
        }
        
        .btn.secondary {
          background: #f1f5f9;
          color: #64748b;
          padding: 14px 28px;
          font-size: 16px;
          border-radius: 10px;
          font-weight: 500;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn.secondary:hover {
          background: #e2e8f0;
        }
        
        .dark-mode .step-badge {
          background: #3730a3;
          color: #a5b4fc;
        }
        
        .dark-mode .step-header h2 {
          color: #f1f5f9;
        }
        
        .dark-mode .step-header p {
          color: #9ca3af;
        }
        
        .dark-mode .instruction-step {
          color: #9ca3af;
        }
        
        .dark-mode .browser-demo {
          background: #1e2937;
        }
        
        .dark-mode .browser-bar {
          background: #0f172a;
        }
        
        .dark-mode .browser-page {
          background: #1e2937;
        }
        
        .dark-mode .page-title {
          color: #f1f5f9;
        }
        
        .dark-mode .line {
          background: #374151;
        }
        
        .dark-mode .alt-instructions {
          background: #1f2937;
        }
        
        .dark-mode .alt-instructions h4 {
          color: #f1f5f9;
        }
        
        .dark-mode .alt-instructions p {
          color: #9ca3af;
        }
        
        .dark-mode .btn.secondary {
          background: #374151;
          color: #9ca3af;
        }
        
        .dark-mode .btn.secondary:hover {
          background: #4b5563;
        }
      `}</style>
    </div>
  );
}

// Main Onboarding Flow Component
export default function OnboardingFlow({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [savedDocument, setSavedDocument] = useState(null);
  
  const steps = [
    { component: WelcomeScreen, title: 'Welcome' },
    { component: SaveFirstItem, title: 'Save First Item' },
    { component: CreateFirstCollection, title: 'Create Collection' },
    { component: TrySearch, title: 'Try Search' },
    { component: InstallBookmarklet, title: 'Install Bookmarklet' },
  ];
  
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };
  
  const handleDocumentCreated = (doc) => {
    setSavedDocument(doc);
  };
  
  const handleFinish = () => {
    // Mark onboarding as complete in localStorage
    localStorage.setItem('smartkeep_onboarding_complete', 'true');
    onComplete();
  };
  
  const CurrentStepComponent = steps[currentStep].component;
  
  // Pass appropriate props based on current step
  const getStepProps = () => {
    switch (currentStep) {
      case 0:
        return { onNext: handleNext };
      case 1:
        return { onNext: handleNext, onDocumentCreated: handleDocumentCreated };
      case 2:
        return { onNext: handleNext, savedDocument: savedDocument };
      case 3:
        return { onNext: handleNext, savedDocument: savedDocument };
      case 4:
        return { onComplete: handleFinish };
      default:
        return {};
    }
  };
  
  return (
    <div className="onboarding-flow">
      <ProgressBar currentStep={currentStep} totalSteps={steps.length} />
      
      <CurrentStepComponent {...getStepProps()} />
      
      <style>{`
        .onboarding-flow {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 9999;
          background: var(--bg-primary, #fff);
          overflow-y: auto;
        }
        
        .onboarding-flow .btn.primary {
          background: #667eea;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .onboarding-flow .btn.primary:hover {
          background: #5568d3;
          transform: translateY(-1px);
        }
        
        .onboarding-flow .btn.primary:disabled {
          background: #94a3b8;
          cursor: not-allowed;
          transform: none;
        }
        
        .dark-mode.onboarding-flow {
          --bg-primary: #1f2937;
        }
      `}</style>
    </div>
  );
}
