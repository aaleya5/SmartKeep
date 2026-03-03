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
      const response = await collectionAPI.getAll();
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
        const collection = collections.find(c => c.id === collectionId);
        await collectionAPI.removeDocument(collectionId, documentId);
        setSelectedCollections(prev => prev.filter(id => id !== collectionId));
      } else {
        // Add to collection
        await collectionAPI.addDocument(collectionId, documentId);
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
      const response = await collectionAPI.create(newCollectionName, null, newCollectionColor);
      const newCollection = response.data;
      
      // Add document to the new collection
      await collectionAPI.addDocument(newCollection.id, documentId);
      
      // Update state
      setSelectedCollections(prev => [...prev, newCollection.id]);
      setNewCollectionName('');
      setNewCollectionColor('#6366f1');
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
                      <span className="collection-name">{collection.name}</span>
                      <span className="collection-count">({collection.document_count})</span>
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
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: white;
          border-radius: 8px;
          width: 90%;
          max-width: 400px;
          max-height: 80vh;
          overflow-y: auto;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-bottom: 1px solid #e5e7eb;
        }
        .modal-header h3 {
          margin: 0;
        }
        .modal-body {
          padding: 16px;
        }
        .document-title {
          color: #6b7280;
          font-size: 0.9rem;
          margin-bottom: 16px;
        }
        .collections-checklist {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }
        .collection-checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .collection-checkbox:hover {
          background: #f3f4f6;
        }
        .collection-checkbox.selected {
          background: #e0e7ff;
        }
        .collection-color {
          width: 12px;
          height: 12px;
          border-radius: 3px;
        }
        .collection-name {
          flex: 1;
        }
        .collection-count {
          color: #9ca3af;
          font-size: 0.85rem;
        }
        .create-new-btn {
          width: 100%;
        }
        .create-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .color-picker {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .color-option {
          width: 24px;
          height: 24px;
          border-radius: 4px;
          border: 2px solid transparent;
          cursor: pointer;
        }
        .color-option.selected {
          border-color: #1f2937;
        }
        .form-actions {
          display: flex;
          gap: 8px;
        }
        .empty-message {
          color: #9ca3af;
          text-align: center;
          padding: 16px;
        }
      `}</style>
    </div>
  );
}

export default AddToCollectionModal;
