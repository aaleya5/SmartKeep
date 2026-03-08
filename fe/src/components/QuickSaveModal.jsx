import { useState, useEffect } from 'react';

/**
 * QuickSaveModal - A modal for quickly saving content via keyboard shortcut
 * 
 * Props:
 * - isOpen: boolean - Whether the modal is open
 * - onClose: () => void - Callback to close the modal
 * - onSave: (data: { url?: string; title?: string; content?: string }) => Promise<void> - Save callback
 */
export default function QuickSaveModal({ isOpen, onClose, onSave }) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('url');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setUrl('');
      setTitle('');
      setContent('');
      setError(null);
      setActiveTab('url');
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (activeTab === 'url') {
        if (!url.trim()) {
          throw new Error('URL is required');
        }
        await onSave({ url: url.trim() });
      } else {
        if (!title.trim() || !content.trim()) {
          throw new Error('Title and content are required');
        }
        await onSave({ title: title.trim(), content: content.trim() });
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="quick-save-overlay" onClick={onClose}>
      <div className="quick-save-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Quick Save</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-tabs">
          <button 
            className={`tab ${activeTab === 'url' ? 'active' : ''}`}
            onClick={() => setActiveTab('url')}
          >
            From URL
          </button>
          <button 
            className={`tab ${activeTab === 'manual' ? 'active' : ''}`}
            onClick={() => setActiveTab('manual')}
          >
            Manual Entry
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {activeTab === 'url' ? (
            <div className="form-group">
              <label htmlFor="quick-url">URL</label>
              <input
                type="url"
                id="quick-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/article"
                autoFocus
                disabled={isLoading}
              />
              <p className="form-hint">Enter a URL to fetch and save content</p>
            </div>
          ) : (
            <>
              <div className="form-group">
                <label htmlFor="quick-title">Title</label>
                <input
                  type="text"
                  id="quick-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter title"
                  autoFocus
                  disabled={isLoading}
                />
              </div>
              <div className="form-group">
                <label htmlFor="quick-content">Content</label>
                <textarea
                  id="quick-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste or type your content..."
                  rows={8}
                  disabled={isLoading}
                />
              </div>
            </>
          )}

          {error && (
            <div className="error-message">{error}</div>
          )}

          <div className="modal-actions">
            <button 
              type="button" 
              className="btn-secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner-small"></span>
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </form>

        <div className="keyboard-hint">
          Press <kbd>Esc</kbd> to close
        </div>
      </div>

      <style>{`
        .quick-save-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .quick-save-modal {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          animation: slideUp 0.2s ease-out;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-header h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0;
          color: #1f2937;
        }

        .close-btn {
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 1.5rem;
          color: #6b7280;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-btn:hover {
          background: #f3f4f6;
        }

        .modal-tabs {
          display: flex;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-tabs .tab {
          flex: 1;
          padding: 0.875rem;
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          color: #6b7280;
          transition: all 0.2s;
        }

        .modal-tabs .tab:hover {
          background: #f9fafb;
        }

        .modal-tabs .tab.active {
          color: #6366f1;
          border-bottom: 2px solid #6366f1;
          margin-bottom: -1px;
        }

        form {
          padding: 1.5rem;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-group label {
          display: block;
          font-size: 0.9rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.95rem;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .form-group textarea {
          resize: vertical;
          font-family: inherit;
        }

        .form-hint {
          font-size: 0.8rem;
          color: #6b7280;
          margin-top: 0.5rem;
        }

        .error-message {
          background: #fef2f2;
          color: #dc2626;
          padding: 0.75rem;
          border-radius: 8px;
          font-size: 0.9rem;
          margin-bottom: 1rem;
        }

        .modal-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
        }

        .btn-primary,
        .btn-secondary {
          padding: 0.625rem 1.25rem;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
          border: none;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-primary {
          background: #6366f1;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #4f46e5;
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #f3f4f6;
          color: #374151;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #e5e7eb;
        }

        .spinner-small {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .keyboard-hint {
          text-align: center;
          padding: 0.75rem;
          font-size: 0.8rem;
          color: #9ca3af;
          border-top: 1px solid #e5e7eb;
        }

        .keyboard-hint kbd {
          background: #f3f4f6;
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.75rem;
        }

        /* Dark mode */
        .dark-mode .quick-save-modal {
          background: #1f2937;
        }

        .dark-mode .modal-header,
        .dark-mode .modal-tabs,
        .dark-mode .keyboard-hint {
          border-color: #374151;
        }

        .dark-mode .modal-header h2,
        .dark-mode .form-group label {
          color: #f3f4f9;
        }

        .dark-mode .close-btn,
        .dark-mode .modal-tabs .tab {
          color: #9ca3af;
        }

        .dark-mode .modal-tabs .tab:hover {
          background: #374151;
        }

        .dark-mode .modal-tabs .tab.active {
          color: #818cf8;
          border-color: #818cf8;
        }

        .dark-mode .form-group input,
        .dark-mode .form-group textarea {
          background: #374151;
          border-color: #4b5563;
          color: #f3f4f9;
        }

        .dark-mode .form-group input:focus,
        .dark-mode .form-group textarea:focus {
          border-color: #818cf8;
        }

        .dark-mode .form-hint {
          color: #9ca3af;
        }

        .dark-mode .btn-secondary {
          background: #374151;
          color: #e5e7eb;
        }

        .dark-mode .btn-secondary:hover:not(:disabled) {
          background: #4b5563;
        }

        .dark-mode .keyboard-hint kbd {
          background: #374151;
        }
      `}</style>
    </div>
  );
}
