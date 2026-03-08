import { useState, useEffect } from 'react';
import { collectionAPI } from '../services/api';

function AddToCollectionModal({ 
  isOpen, 
  onClose, 
  documentId,
  documentTitle,
  onSuccess 
}) {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionColor, setNewCollectionColor] = useState('#6366f1');
  const [newCollectionIcon, setNewCollectionIcon] = useState('📁');
  const [selectedCollections, setSelectedCollections] = useState([]);

  useEffect(() => {
    if (isOpen && documentId) {
      fetchCollections();
      fetchDocumentCollections();
    }
  }, [isOpen, documentId]);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const response = await collectionAPI.getAll(true, 'manual');
      setCollections(response.data.collections || []);
    } catch (err) {
      setError('Failed to load collections');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocumentCollections = async () => {
    try {
      const response = await collectionAPI.getForDocument(documentId);
      const docCollections = response.data || [];
      setSelectedCollections(docCollections.map(c => c.id));
    } catch (err) {
      // Document might not be in any collections yet
      setSelectedCollections([]);
    }
  };

  const handleToggleCollection = async (collectionId) => {
    setSaving(true);
    try {
      if (selectedCollections.includes(collectionId)) {
        // Remove from collection
        await collectionAPI.removeDocument(collectionId, documentId);
        setSelectedCollections(prev => prev.filter(id => id !== collectionId));
      } else {
        // Add to collection (single document)
        await collectionAPI.addDocuments(collectionId, [documentId]);
        setSelectedCollections(prev => [...prev, collectionId]);
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      setError('Failed to update collection');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCollection = async (e) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;

    setSaving(true);
    try {
      // Create the collection
      const response = await collectionAPI.create(newCollectionName, null, newCollectionColor, newCollectionIcon, false);
      const newCollection = response.data;
      
      // Add document to the new collection (if documentId is provided)
      if (documentId) {
        await collectionAPI.addDocuments(newCollection.id, [documentId]);
        setSelectedCollections(prev => [...prev, newCollection.id]);
      }
      
      setNewCollectionName('');
      setNewCollectionColor('#6366f1');
      setNewCollectionIcon('📁');
      setShowCreateForm(false);
      fetchCollections(); // Refresh list
      
      if (onSuccess) onSuccess();
    } catch (err) {
      setError('Failed to create collection');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const colors = [
    '#6366f1', '#ec4899', '#10b981', '#f59e0b',
    '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6',
  ];

  const icons = ['📁', '📚', '⭐', '💡', '🔖', '🏷️', '📌', '🗂️'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add to Collection</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {documentTitle && (
            <p className="document-title">Document: {documentTitle}</p>
          )}

          {error && <div className="alert error">{error}</div>}

          {loading ? (
            <div className="loading">Loading collections...</div>
          ) : (
            <>
              {/* Collections List */}
              <div className="collections-checklist">
                {collections.length === 0 && !showCreateForm ? (
                  <p className="empty-message">No collections yet. Create one to get started!</p>
                ) : (
                  collections.map(collection => (
                    <label 
                      key={collection.id} 
                      className={`collection-checkbox ${selectedCollections.includes(collection.id) ? 'selected' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCollections.includes(collection.id)}
                        onChange={() => handleToggleCollection(collection.id)}
                        disabled={saving}
                      />
                      <span 
                        className="collection-color" 
                        style={{ backgroundColor: collection.color }}
                      />
                      <span className="collection-icon">{collection.icon}</span>
                      <span className="collection-name">{collection.name}</span>
                      <span className="collection-count">({collection.document_count || collection.item_count || 0})</span>
                    </label>
                  ))
                )}
              </div>

              {/* Create New Collection Form */}
              {showCreateForm ? (
                <form onSubmit={handleCreateCollection} className="create-form">
                  <input
                    type="text"
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    placeholder="Collection name"
                    autoFocus
                  />
                  <div className="color-picker">
                    {colors.map(color => (
                      <button
                        key={color}
                        type="button"
                        className={`color-option ${newCollectionColor === color ? 'selected' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewCollectionColor(color)}
                      />
                    ))}
                  </div>
                  <div className="icon-picker">
                    {icons.map(icon => (
                      <button
                        key={icon}
                        type="button"
                        className={`icon-option ${newCollectionIcon === icon ? 'selected' : ''}`}
                        onClick={() => setNewCollectionIcon(icon)}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                      {saving ? 'Creating...' : 'Create & Add'}
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm"
                      onClick={() => setShowCreateForm(false)}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button 
                  className="btn btn-secondary create-new-btn"
                  onClick={() => setShowCreateForm(true)}
                >
                  + Create New Collection
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000;
        }
        
        .modal-content {
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-lg);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          width: 90%; max-width: 420px;
          max-height: 85vh; overflow-y: auto;
          color: var(--text-color);
        }

        .modal-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 24px; border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        
        .modal-header h3 { margin: 0; font-size: 1.25rem; }

        .close-btn {
          background: transparent; border: none;
          font-size: 1.5rem; cursor: pointer; color: var(--text-secondary);
          transition: color 0.2s;
        }
        .close-btn:hover { color: var(--text-color); }

        .modal-body { padding: 24px; }

        .document-title {
          color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 24px;
          padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px;
        }

        .alert.error {
          background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2);
          padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 0.9rem;
        }

        .collections-checklist {
          display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px;
        }

        .collection-checkbox {
          display: flex; align-items: center; gap: 12px;
          padding: 12px; border-radius: 8px; border: 1px solid transparent;
          cursor: pointer; transition: all 0.2s;
        }
        .collection-checkbox:hover { background: rgba(255,255,255,0.03); }
        .collection-checkbox.selected {
          background: rgba(245, 200, 66, 0.1); border-color: rgba(245, 200, 66, 0.3);
        }

        .collection-color { width: 12px; height: 12px; border-radius: 50%; }
        .collection-icon { font-size: 1.1rem; }
        .collection-name { flex: 1; font-family: var(--font-sans); font-weight: 500; font-size: 14px; }
        .collection-count { color: var(--text-secondary); font-size: 0.85rem; font-family: var(--font-mono); }
        
        input[type="checkbox"] { accent-color: var(--accent-color); }

        .create-new-btn { width: 100%; border-style: dashed; }

        .create-form { display: flex; flex-direction: column; gap: 16px; }
        
        .create-form input {
          padding: 12px; background: rgba(0,0,0,0.2);
          border: 1px solid var(--border-color); border-radius: 8px;
          color: var(--text-color); font-size: 0.95rem; outline: none; transition: all 0.2s;
        }
        .create-form input:focus { border-color: var(--accent-color); box-shadow: 0 0 0 2px rgba(245, 200, 66, 0.1); }

        .color-picker { display: flex; gap: 8px; flex-wrap: wrap; }
        .color-option {
          width: 24px; height: 24px; border-radius: 50%;
          border: 2px solid transparent; cursor: pointer; transition: transform 0.2s;
        }
        .color-option:hover { transform: scale(1.1); }
        .color-option.selected { border-color: white; box-shadow: 0 0 0 2px var(--accent-color); }

        .icon-picker { display: flex; gap: 8px; flex-wrap: wrap; }
        .icon-option {
          width: 32px; height: 32px; border: none; background: transparent;
          cursor: pointer; font-size: 1.1rem; border-radius: 8px; transition: background 0.2s;
        }
        .icon-option:hover { background: rgba(255,255,255,0.05); }
        .icon-option.selected { background: rgba(255,255,255,0.1); box-shadow: inset 0 0 0 1px var(--border-color); }

        .form-actions { display: flex; gap: 12px; margin-top: 8px; }
        .form-actions .btn { flex: 1; }
        
        .empty-message { color: var(--text-secondary); text-align: center; padding: 24px; }
        .loading { text-align: center; padding: 32px; color: var(--text-secondary); font-family: var(--font-mono); }
      `}</style>
    </div>
  );
}

export default AddToCollectionModal;
