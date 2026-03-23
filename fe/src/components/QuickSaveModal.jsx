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
          position: fixed; inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
          z-index: 9999; animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .quick-save-modal {
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-lg);
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
          width: 100%; max-width: 500px; max-height: 90vh;
          overflow-y: auto; color: var(--text-color);
          animation: slideUp 0.2s ease-out;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .modal-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 24px; border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .modal-header h2 { font-size: 1.25rem; font-weight: 600; margin: 0; }

        .close-btn {
          width: 32px; height: 32px; border: none; background: transparent;
          cursor: pointer; font-size: 1.5rem; color: var(--text-secondary);
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
        .close-btn:hover { color: var(--text-color); background: rgba(255,255,255,0.05); }

        .modal-tabs { display: flex; border-bottom: 1px solid rgba(255,255,255,0.05); }

        .modal-tabs .tab {
          flex: 1; padding: 14px; border: none; background: transparent;
          cursor: pointer; font-size: 0.9rem; font-weight: 500;
          color: var(--text-secondary); transition: all 0.2s;
        }
        .modal-tabs .tab:hover { color: var(--text-color); background: rgba(255,255,255,0.02); }
        .modal-tabs .tab.active {
          color: var(--accent-color);
          border-bottom: 2px solid var(--accent-color);
          margin-bottom: -1px;
        }

        form { padding: 24px; }

        .form-group { margin-bottom: 20px; }
        .form-group label {
          display: block; font-size: 0.9rem; font-weight: 500;
          color: var(--text-secondary); margin-bottom: 8px;
        }

        .form-group input, .form-group textarea {
          width: 100%; padding: 12px; background: rgba(0,0,0,0.2);
          border: 1px solid var(--border-color); border-radius: 8px;
          color: var(--text-color); font-size: 0.95rem; outline: none; transition: all 0.2s;
        }

        .form-group input:focus, .form-group textarea:focus {
          border-color: var(--accent-color);
          box-shadow: 0 0 0 2px rgba(245, 200, 66, 0.1);
        }

        .form-group textarea { font-family: var(--font-mono); font-size: 13px; }

        .form-hint { font-size: 0.8rem; color: var(--text-secondary); margin-top: 8px; }

        .error-message {
          background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2);
          padding: 12px; border-radius: 8px; font-size: 0.9rem; margin-bottom: 20px;
        }

        .modal-actions { display: flex; gap: 12px; justify-content: flex-end; }

        .btn-primary, .btn-secondary {
          padding: 10px 20px; border-radius: 8px; font-size: 0.95rem; font-weight: 500;
          cursor: pointer; transition: background 0.2s; border: none;
          display: flex; align-items: center; gap: 8px;
        }

        .btn-primary { background: var(--accent-color); color: var(--bg-color); font-weight: 700; }
        .btn-primary:hover:not(:disabled) { background: var(--accent-hover); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

        .btn-secondary { background: rgba(255,255,255,0.05); color: var(--text-color); }
        .btn-secondary:hover:not(:disabled) { background: rgba(255,255,255,0.1); }

        .spinner-small {
          width: 14px; height: 14px;
          border: 2px solid rgba(0,0,0,0.3); border-top-color: var(--bg-color);
          border-radius: 50%; animation: spin 0.8s linear infinite;
        }

        .keyboard-hint {
          text-align: center; padding: 12px; font-size: 0.8rem;
          color: var(--text-secondary); border-top: 1px solid rgba(255,255,255,0.05);
        }

        .keyboard-hint kbd {
          background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px;
          font-family: var(--font-mono); font-size: 10px; color: var(--text-color);
        }
      `}</style>
    </div>
  );
}
