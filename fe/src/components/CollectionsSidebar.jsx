import { useState, useEffect } from 'react';
import { collectionAPI } from '../services/api';

function CollectionsSidebar({ 
  selectedCollection, 
  onSelectCollection,
  onCreateCollection,
  refreshTrigger 
}) {
  const [collections, setCollections] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionColor, setNewCollectionColor] = useState('#6366f1');

  const fetchCollections = async () => {
    setIsLoading(true);
    try {
      const response = await collectionAPI.getAll();
      setCollections(response.data.collections || []);
    } catch (err) {
      console.error('Failed to fetch collections:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, [refreshTrigger]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;

    try {
      await collectionAPI.create(newCollectionName, null, newCollectionColor);
      setNewCollectionName('');
      setNewCollectionColor('#6366f1');
      setShowCreateForm(false);
      fetchCollections();
      if (onCreateCollection) onCreateCollection();
    } catch (err) {
      console.error('Failed to create collection:', err);
    }
  };

  const colors = [
    '#6366f1', // Indigo
    '#ec4899', // Pink
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#3b82f6', // Blue
    '#8b5cf6', // Violet
    '#ef4444', // Red
    '#14b8a6', // Teal
  ];

  return (
    <div className="collections-sidebar">
      <div className="collections-header">
        <h3>Collections</h3>
        <button 
          className="btn-icon"
          onClick={() => setShowCreateForm(!showCreateForm)}
          title="Create new collection"
        >
          +
        </button>
      </div>

      {/* Create Collection Form */}
      {showCreateForm && (
        <form onSubmit={handleCreate} className="create-collection-form">
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
            <button type="submit" className="btn btn-primary btn-sm">
              Create
            </button>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={() => setShowCreateForm(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Collections List */}
      <div className="collections-list">
        <button
          className={`collection-item ${selectedCollection === null ? 'active' : ''}`}
          onClick={() => onSelectCollection(null)}
        >
          <span className="collection-icon">📚</span>
          <span className="collection-name">All Documents</span>
        </button>

        {collections.map(collection => (
          <button
            key={collection.id}
            className={`collection-item ${selectedCollection === collection.id ? 'active' : ''}`}
            onClick={() => onSelectCollection(collection.id)}
          >
            <span 
              className="collection-color" 
              style={{ backgroundColor: collection.color }}
            />
            <span className="collection-name">{collection.name}</span>
            <span className="collection-count">{collection.document_count}</span>
          </button>
        ))}
      </div>

      {isLoading && <div className="loading-small">Loading...</div>}
    </div>
  );
}

export default CollectionsSidebar;
