import { useState, useEffect } from 'react';
import { preferencesAPI, importExportAPI } from '../services/api';

// Accent color options
const ACCENT_COLORS = [
  { id: '#00C9A7', name: 'Teal' },
  { id: '#667eea', name: 'Indigo' },
  { id: '#10b981', name: 'Emerald' },
  { id: '#f59e0b', name: 'Amber' },
  { id: '#ef4444', name: 'Red' },
  { id: '#8b5cf6', name: 'Violet' },
];

// Keyboard shortcuts
const KEYBOARD_SHORTCUTS = [
  { action: 'Open command palette', keys: '⌘ K' },
  { action: 'New save (from URL)', keys: '⌘ N' },
  { action: 'Toggle dark mode', keys: '⌘ ⇧ D' },
  { action: 'Go to Library', keys: '⌘ 1' },
  { action: 'Go to Search', keys: '⌘ 2' },
  { action: 'Go to Collections', keys: '⌘ 3' },
  { action: 'Go to Insights', keys: '⌘ 4' },
  { action: 'Go to Annotations', keys: '⌘ 5' },
  { action: 'Open settings', keys: '⌘ ,' },
  { action: 'Focus search', keys: '/' },
];

// App version
const APP_VERSION = '1.0.0';

// Settings Section Component
function SettingsSection({ title, children }) {
  return (
    <div className="settings-section">
      <h3 className="section-title">{title}</h3>
      <div className="section-content">
        {children}
      </div>
    </div>
  );
}

// Main SettingsPage Component
function SettingsPage({ onThemeChange }) {
  // Active section
  const [activeSection, setActiveSection] = useState('general');
  
  // Preferences state
  const [preferences, setPreferences] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  
  // API key state
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingLLM, setTestingLLM] = useState(false);
  const [llmTestResult, setLlmTestResult] = useState(null);
  
  // Import state
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  
  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    setIsLoading(true);
    try {
      const response = await preferencesAPI.get();
      setPreferences(response.data);
    } catch (err) {
      console.error('Failed to load preferences:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreference = async (key, value) => {
    if (!preferences) return;
    
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      const response = await preferencesAPI.update({ [key]: value });
      setPreferences(response.data);
      setSaveMessage('Saved!');
      setTimeout(() => setSaveMessage(''), 2000);
      
      // Handle theme change
      if (key === 'theme' && onThemeChange) {
        onThemeChange(value);
      }
    } catch (err) {
      console.error('Failed to update preference:', err);
      setSaveMessage('Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const testLLMConnection = async () => {
    setTestingLLM(true);
    setLlmTestResult(null);
    
    try {
      const response = await preferencesAPI.testLLM(
        preferences.llm_provider,
        apiKey,
        preferences.ollama_base_url
      );
      setLlmTestResult(response.data);
    } catch (err) {
      setLlmTestResult({ success: false, error: err.message });
    } finally {
      setTestingLLM(false);
    }
  };

  const saveApiKey = async () => {
    if (!apiKey.trim()) return;
    
    setIsSaving(true);
    try {
      await preferencesAPI.update({ groq_api_key: apiKey });
      setApiKey('');
      setSaveMessage('API key saved!');
      setTimeout(() => setSaveMessage(''), 2000);
    } catch (err) {
      setSaveMessage('Failed to save API key');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportJSON = async () => {
    try {
      const response = await importExportAPI.exportJSON();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `smartkeep-export-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Please try again.');
    }
  };

  const handleExportMarkdown = async () => {
    try {
      const response = await importExportAPI.exportMarkdown();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `smartkeep-export-${new Date().toISOString().split('T')[0]}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Please try again.');
    }
  };

  const handleImport = async (type, file) => {
    if (!file) return;
    
    setIsImporting(true);
    setImportMessage('');
    
    try {
      let response;
      switch (type) {
        case 'pocket':
          response = await importExportAPI.importPocket(file);
          break;
        case 'raindrop':
          response = await importExportAPI.importRaindrop(file);
          break;
        case 'bookmarks':
          response = await importExportAPI.importBookmarks(file);
          break;
        default:
          return;
      }
      
      setImportMessage(`Import queued! ${response.data.queued_count} items will be imported.`);
    } catch (err) {
      console.error('Import failed:', err);
      setImportMessage('Import failed. Please check the file format.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteAll = async () => {
    if (deleteInput !== 'DELETE') return;
    
    setDeleting(true);
    try {
      // This would call a delete all endpoint
      alert('Delete all functionality would be implemented here');
      setShowDeleteConfirm(false);
      setDeleteInput('');
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleting(false);
    }
  };

  const sections = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'appearance', label: 'Appearance', icon: '🎨' },
    { id: 'enrichment', label: 'Scraping & Enrichment', icon: '🤖' },
    { id: 'data', label: 'Data & Export', icon: '💾' },
    { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: '⌨️' },
    { id: 'about', label: 'About', icon: 'ℹ️' },
  ];

  if (isLoading) {
    return (
      <div className="settings-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <span>Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      {/* Header */}
      <div className="settings-header">
        <h1>Settings</h1>
        {saveMessage && <span className="save-message">{saveMessage}</span>}
      </div>

      <div className="settings-layout">
        {/* Left Navigation */}
        <nav className="settings-nav">
          {sections.map(section => (
            <button
              key={section.id}
              className={`nav-item ${activeSection === section.id ? 'active' : ''}`}
              onClick={() => setActiveSection(section.id)}
            >
              <span className="nav-icon">{section.icon}</span>
              <span className="nav-label">{section.label}</span>
            </button>
          ))}
        </nav>

        {/* Right Content */}
        <div className="settings-content">
          {/* General Section */}
          {activeSection === 'general' && (
            <SettingsSection title="General">
              <div className="setting-item">
                <label>Default Search Mode</label>
                <select
                  value={preferences?.default_search_mode || 'hybrid'}
                  onChange={(e) => updatePreference('default_search_mode', e.target.value)}
                  disabled={isSaving}
                >
                  <option value="keyword">Keyword</option>
                  <option value="semantic">Semantic</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>

              <div className="setting-item">
                <label>Default Library View</label>
                <select
                  value={preferences?.default_library_view || 'grid'}
                  onChange={(e) => updatePreference('default_library_view', e.target.value)}
                  disabled={isSaving}
                >
                  <option value="grid">Grid</option>
                  <option value="list">List</option>
                  <option value="compact">Compact</option>
                </select>
              </div>

              <div className="setting-item">
                <label>Default Sort Order</label>
                <select
                  value={preferences?.default_sort_order || 'newest'}
                  onChange={(e) => updatePreference('default_sort_order', e.target.value)}
                  disabled={isSaving}
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="title">Title A-Z</option>
                </select>
              </div>

              <div className="setting-item">
                <label>Items Per Page</label>
                <select
                  value={preferences?.page_size || 20}
                  onChange={(e) => updatePreference('page_size', parseInt(e.target.value))}
                  disabled={isSaving}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </SettingsSection>
          )}

          {/* Appearance Section */}
          {activeSection === 'appearance' && (
            <SettingsSection title="Appearance">
              <div className="setting-item">
                <label>Theme</label>
                <select
                  value={preferences?.theme || 'system'}
                  onChange={(e) => updatePreference('theme', e.target.value)}
                  disabled={isSaving}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </div>

              <div className="setting-item">
                <label>Accent Color</label>
                <div className="color-picker">
                  {ACCENT_COLORS.map(color => (
                    <button
                      key={color.id}
                      className={`color-option ${preferences?.accent_color === color.id ? 'active' : ''}`}
                      style={{ backgroundColor: color.id }}
                      onClick={() => updatePreference('accent_color', color.id)}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <div className="setting-item">
                <label>Reader Font Size</label>
                <select
                  value={preferences?.reader_font_size || 'medium'}
                  onChange={(e) => updatePreference('reader_font_size', e.target.value)}
                  disabled={isSaving}
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>

              <div className="setting-item">
                <label>Compact Density</label>
                <div className="toggle-wrapper">
                  <button
                    className={`toggle-btn ${preferences?.compact_density ? 'active' : ''}`}
                    onClick={() => updatePreference('compact_density', !preferences?.compact_density)}
                    disabled={isSaving}
                  >
                    {preferences?.compact_density ? 'On' : 'Off'}
                  </button>
                </div>
              </div>
            </SettingsSection>
          )}

          {/* Scraping & Enrichment Section */}
          {activeSection === 'enrichment' && (
            <SettingsSection title="Scraping & Enrichment">
              <div className="setting-item">
                <label>Auto-enrichment</label>
                <div className="toggle-wrapper">
                  <button
                    className={`toggle-btn ${preferences?.auto_enrich ? 'active' : ''}`}
                    onClick={() => updatePreference('auto_enrich', !preferences?.auto_enrich)}
                    disabled={isSaving}
                  >
                    {preferences?.auto_enrich ? 'On' : 'Off'}
                  </button>
                </div>
                <p className="setting-hint">Automatically enrich content with AI when saved</p>
              </div>

              <div className="setting-item">
                <label>LLM Provider</label>
                <select
                  value={preferences?.llm_provider || 'groq'}
                  onChange={(e) => updatePreference('llm_provider', e.target.value)}
                  disabled={isSaving}
                >
                  <option value="groq">Groq</option>
                  <option value="ollama">Local Ollama</option>
                </select>
              </div>

              {preferences?.llm_provider === 'groq' && (
                <div className="setting-item">
                  <label>Groq API Key</label>
                  <div className="api-key-input">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={preferences?.has_api_key ? 'API key saved' : 'Enter API key'}
                    />
                    <button
                      className="icon-btn"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                  <button
                    className="btn secondary"
                    onClick={saveApiKey}
                    disabled={isSaving || !apiKey.trim()}
                  >
                    Save API Key
                  </button>
                  <button
                    className="btn secondary"
                    onClick={testLLMConnection}
                    disabled={testingLLM || !preferences?.has_api_key}
                  >
                    {testingLLM ? 'Testing...' : 'Test Connection'}
                  </button>
                  {llmTestResult && (
                    <div className={`test-result ${llmTestResult.success ? 'success' : 'error'}`}>
                      {llmTestResult.success 
                        ? `✅ Connected! Latency: ${llmTestResult.latency_ms}ms, Model: ${llmTestResult.model}`
                        : `❌ ${llmTestResult.error}`
                      }
                    </div>
                  )}
                </div>
              )}

              {preferences?.llm_provider === 'ollama' && (
                <div className="setting-item">
                  <label>Ollama Base URL</label>
                  <input
                    type="text"
                    value={preferences?.ollama_base_url || ''}
                    onChange={(e) => updatePreference('ollama_base_url', e.target.value)}
                    placeholder="http://localhost:11434"
                    disabled={isSaving}
                  />
                  <button
                    className="btn secondary"
                    onClick={testLLMConnection}
                    disabled={testingLLM}
                  >
                    {testingLLM ? 'Testing...' : 'Test Connection'}
                  </button>
                  {llmTestResult && (
                    <div className={`test-result ${llmTestResult.success ? 'success' : 'error'}`}>
                      {llmTestResult.success 
                        ? `✅ Connected! Latency: ${llmTestResult.latency_ms}ms`
                        : `❌ ${llmTestResult.error}`
                      }
                    </div>
                  )}
                </div>
              )}

              <div className="setting-item">
                <label>Max Content Length</label>
                <select
                  value={preferences?.max_content_length || 10000}
                  onChange={(e) => updatePreference('max_content_length', parseInt(e.target.value))}
                  disabled={isSaving}
                >
                  <option value={5000}>5,000 characters</option>
                  <option value={10000}>10,000 characters</option>
                  <option value={20000}>20,000 characters</option>
                </select>
                <p className="setting-hint">Maximum content length to process for enrichment</p>
              </div>

              <div className="setting-item">
                <label>Supported Domains</label>
                <div className="supported-domains">
                  <span className="domain-tag">medium.com</span>
                  <span className="domain-tag">github.com</span>
                  <span className="domain-tag">dev.to</span>
                  <span className="domain-tag">stackoverflow.com</span>
                  <span className="domain-tag">hackernews</span>
                  <span className="domain-tag">+ more</span>
                </div>
              </div>
            </SettingsSection>
          )}

          {/* Data & Export Section */}
          {activeSection === 'data' && (
            <SettingsSection title="Data & Export">
              <div className="export-section">
                <h4>Export</h4>
                <div className="export-buttons">
                  <button className="btn primary" onClick={handleExportJSON}>
                    📥 Export as JSON
                  </button>
                  <button className="btn primary" onClick={handleExportMarkdown}>
                    📥 Export as Markdown
                  </button>
                </div>
                <p className="setting-hint">
                  Export all data as JSON or Markdown files (one per article)
                </p>
              </div>

              <div className="import-section">
                <h4>Import</h4>
                <div className="import-buttons">
                  <label className="file-input-label">
                    📥 Import from Pocket
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => handleImport('pocket', e.target.files[0])}
                      hidden
                    />
                  </label>
                  <label className="file-input-label">
                    📥 Import from Raindrop.io
                    <input
                      type="file"
                      accept=".csv,.json"
                      onChange={(e) => handleImport('raindrop', e.target.files[0])}
                      hidden
                    />
                  </label>
                  <label className="file-input-label">
                    📥 Import Bookmarks
                    <input
                      type="file"
                      accept=".html"
                      onChange={(e) => handleImport('bookmarks', e.target.files[0])}
                      hidden
                    />
                  </label>
                </div>
                {importMessage && <p className="import-message">{importMessage}</p>}
              </div>

              <div className="danger-section">
                <h4>Danger Zone</h4>
                <button
                  className="btn danger"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  🗑️ Delete All Data
                </button>
              </div>

              {/* Delete Confirmation Modal */}
              {showDeleteConfirm && (
                <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
                  <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
                    <h3>Delete All Data?</h3>
                    <p>This will permanently delete all your saved content, collections, and annotations.</p>
                    <input
                      type="text"
                      value={deleteInput}
                      onChange={(e) => setDeleteInput(e.target.value)}
                      placeholder="Type DELETE to confirm"
                      className="confirm-input"
                    />
                    <div className="dialog-buttons">
                      <button
                        className="btn secondary"
                        onClick={() => setShowDeleteConfirm(false)}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn danger"
                        onClick={handleDeleteAll}
                        disabled={deleteInput !== 'DELETE' || deleting}
                      >
                        {deleting ? 'Deleting...' : 'Delete Everything'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </SettingsSection>
          )}

          {/* Keyboard Shortcuts Section */}
          {activeSection === 'shortcuts' && (
            <SettingsSection title="Keyboard Shortcuts">
              <table className="shortcuts-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Shortcut</th>
                  </tr>
                </thead>
                <tbody>
                  {KEYBOARD_SHORTCUTS.map((shortcut, index) => (
                    <tr key={index}>
                      <td>{shortcut.action}</td>
                      <td><kbd>{shortcut.keys}</kbd></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SettingsSection>
          )}

          {/* About Section */}
          {activeSection === 'about' && (
            <SettingsSection title="About">
              <div className="about-info">
                <div className="app-logo">📚</div>
                <h2>SmartKeep</h2>
                <p className="version">Version {APP_VERSION}</p>
                <p className="description">
                  Your AI-powered personal library for saving, organizing, and learning from web content.
                </p>
                
                <div className="about-links">
                  <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                    🐙 GitHub
                  </a>
                  <a href="/api/docs" target="_blank" rel="noopener noreferrer">
                    📚 API Documentation
                  </a>
                </div>

                <div className="tech-stack">
                  <h4>Built with</h4>
                  <div className="tech-tags">
                    <span className="tech-tag">React</span>
                    <span className="tech-tag">FastAPI</span>
                    <span className="tech-tag">PostgreSQL</span>
                    <span className="tech-tag">Recharts</span>
                    <span className="tech-tag">Groq</span>
                  </div>
                </div>
              </div>
            </SettingsSection>
          )}
        </div>
      </div>

      <style>{`
        .settings-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 1.5rem;
        }

        .settings-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .settings-header h1 {
          margin: 0;
          font-size: 1.75rem;
          color: #1f2937;
        }

        .save-message {
          color: #10b981;
          font-size: 0.9rem;
        }

        .settings-layout {
          display: grid;
          grid-template-columns: 220px 1fr;
          gap: 2rem;
        }

        /* Navigation */
        .settings-nav {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: none;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.9rem;
          color: #6b7280;
          text-align: left;
          transition: all 0.2s;
        }

        .nav-item:hover {
          background: #f3f4f6;
          color: #374151;
        }

        .nav-item.active {
          background: #e0e7ff;
          color: #667eea;
          font-weight: 500;
        }

        .nav-icon {
          font-size: 1.1rem;
        }

        /* Content */
        .settings-content {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .settings-section {
          margin-bottom: 2rem;
        }

        .section-title {
          margin: 0 0 1rem;
          font-size: 1.1rem;
          color: #1f2937;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .section-content {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .setting-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .setting-item label {
          font-size: 0.9rem;
          font-weight: 500;
          color: #374151;
        }

        .setting-item select,
        .setting-item input[type="text"],
        .setting-item input[type="password"] {
          padding: 0.6rem 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 0.9rem;
          max-width: 300px;
        }

        .setting-item select:focus,
        .setting-item input:focus {
          outline: none;
          border-color: #667eea;
        }

        .setting-hint {
          font-size: 0.8rem;
          color: #9ca3af;
          margin: 0;
        }

        /* Toggle */
        .toggle-wrapper {
          display: flex;
        }

        .toggle-btn {
          padding: 0.5rem 1rem;
          background: #e5e7eb;
          border: none;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          min-width: 60px;
        }

        .toggle-btn.active {
          background: #10b981;
          color: white;
        }

        /* Color Picker */
        .color-picker {
          display: flex;
          gap: 0.5rem;
        }

        .color-option {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2px solid transparent;
          cursor: pointer;
          transition: all 0.2s;
        }

        .color-option.active {
          border-color: #1f2937;
          transform: scale(1.1);
        }

        /* API Key */
        .api-key-input {
          display: flex;
          gap: 0.5rem;
          max-width: 400px;
        }

        .api-key-input input {
          flex: 1;
        }

        .icon-btn {
          padding: 0.5rem;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          cursor: pointer;
        }

        /* Buttons */
        .btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn.primary {
          background: #667eea;
          color: white;
        }

        .btn.primary:hover {
          background: #5568d3;
        }

        .btn.secondary {
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #e5e7eb;
        }

        .btn.secondary:hover {
          background: #e5e7eb;
        }

        .btn.danger {
          background: #fee2e2;
          color: #dc2626;
        }

        .btn.danger:hover {
          background: #fecaca;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Test Result */
        .test-result {
          padding: 0.75rem;
          border-radius: 8px;
          font-size: 0.85rem;
          margin-top: 0.5rem;
        }

        .test-result.success {
          background: #d1fae5;
          color: #065f46;
        }

        .test-result.error {
          background: #fee2e2;
          color: #991b1b;
        }

        /* Export/Import */
        .export-section,
        .import-section,
        .danger-section {
          padding: 1rem 0;
        }

        .export-section h4,
        .import-section h4,
        .danger-section h4 {
          margin: 0 0 1rem;
          font-size: 0.95rem;
          color: #6b7280;
        }

        .export-buttons,
        .import-buttons {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .file-input-label {
          padding: 0.6rem 1rem;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .file-input-label:hover {
          background: #e5e7eb;
        }

        .import-message {
          margin-top: 1rem;
          color: #10b981;
          font-size: 0.9rem;
        }

        /* Supported Domains */
        .supported-domains {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .domain-tag {
          padding: 0.25rem 0.5rem;
          background: #e0e7ff;
          color: #667eea;
          border-radius: 4px;
          font-size: 0.75rem;
        }

        /* Shortcuts Table */
        .shortcuts-table {
          width: 100%;
          border-collapse: collapse;
        }

        .shortcuts-table th,
        .shortcuts-table td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }

        .shortcuts-table th {
          font-size: 0.85rem;
          color: #6b7280;
          font-weight: 500;
        }

        .shortcuts-table td {
          font-size: 0.9rem;
        }

        kbd {
          padding: 0.25rem 0.5rem;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.85rem;
        }

        /* About */
        .about-info {
          text-align: center;
          padding: 2rem;
        }

        .app-logo {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .about-info h2 {
          margin: 0;
          color: #1f2937;
        }

        .version {
          color: #6b7280;
          margin: 0.5rem 0;
        }

        .description {
          color: #4b5563;
          max-width: 400px;
          margin: 1rem auto;
        }

        .about-links {
          display: flex;
          justify-content: center;
          gap: 1.5rem;
          margin: 1.5rem 0;
        }

        .about-links a {
          color: #667eea;
          text-decoration: none;
        }

        .about-links a:hover {
          text-decoration: underline;
        }

        .tech-stack h4 {
          margin: 0 0 0.75rem;
          font-size: 0.9rem;
          color: #6b7280;
        }

        .tech-tags {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .tech-tag {
          padding: 0.25rem 0.75rem;
          background: #f3f4f6;
          border-radius: 12px;
          font-size: 0.8rem;
          color: #4b5563;
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
         1000;
        z-index:  }

        .confirm-dialog {
          background: white;
          padding: 1.5rem;
          border-radius: 12px;
          max-width: 400px;
          width: 90%;
        }

        .confirm-dialog h3 {
          margin: 0 0 0.5rem;
          color: #dc2626;
        }

        .confirm-dialog p {
          color: #6b7280;
          margin-bottom: 1rem;
        }

        .confirm-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 1rem;
          margin-bottom: 1rem;
        }

        .dialog-buttons {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
        }

        /* Loading */
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 4rem 2rem;
          gap: 1rem;
          color: #6b7280;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e5e7eb;
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Dark mode */
        .app.dark-mode .settings-header h1,
        .app.dark-mode .section-title,
        .app.dark-mode .setting-item label,
        .app.dark-mode .about-info h2 {
          color: #f3f4f6;
        }

        .app.dark-mode .settings-nav .nav-item {
          color: #9ca3af;
        }

        .app.dark-mode .settings-nav .nav-item:hover {
          background: #374151;
          color: #e5e7eb;
        }

        .app.dark-mode .settings-nav .nav-item.active {
          background: #4f46e5;
          color: white;
        }

        .app.dark-mode .settings-content {
          background: #1f2937;
        }

        .app.dark-mode .section-title {
          border-color: #374151;
        }

        .app.dark-mode .setting-item select,
        .app.dark-mode .setting-item input {
          background: #374151;
          border-color: #4b5563;
          color: #f3f4f6;
        }

        .app.dark-mode .toggle-btn {
          background: #4b5563;
          color: #e5e7eb;
        }

        .app.dark-mode .toggle-btn.active {
          background: #10b981;
          color: white;
        }

        .app.dark-mode .shortcuts-table th {
          color: #9ca3af;
        }

        .app.dark-mode .shortcuts-table td,
        .app.dark-mode kbd {
          background: #374151;
          border-color: #4b5563;
        }

        .app.dark-mode .confirm-dialog,
        .app.dark-mode .file-input-label {
          background: #1f2937;
          border-color: #374151;
          color: #f3f4f6;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .settings-layout {
            grid-template-columns: 1fr;
          }

          .settings-nav {
            flex-direction: row;
            overflow-x: auto;
            padding-bottom: 0.5rem;
          }

          .nav-item {
            white-space: nowrap;
          }
        }
      `}</style>
    </div>
  );
}

export default SettingsPage;
