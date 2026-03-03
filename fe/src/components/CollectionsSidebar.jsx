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
  const [newCollectionIcon, setNewCollectionIcon] = useState('📁');

  const fetchCollections = async () => {
    setIsLoading(true);
    try {
      const response = await collectionAPI.getAll(true, 'manual');
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
      await collectionAPI.create(newCollectionName, null, newCollectionColor, newCollectionIcon, false);
      setNewCollectionName('');
      setNewCollectionColor('#6366f1');
      setNewCollectionIcon('📁');
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

  const icons = ['📁', '📚', '⭐', '💡', '🔖', '🏷️', '📌', '🗂️'];

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
            <span className="collection-icon">{collection.icon}</span>
            <span className="collection-name">{collection.name}</span>
            <span className="collection-count">{collection.document_count || collection.item_count || 0}</span>
          </button>
        ))}
      </div>

      {isLoading && <div className="loading-small">Loading...</div>}

      <style>{`
        .collections-sidebar {
          width: 220px;
          padding: 1rem;
          border-right: 1px solid #e5e7eb;
          background: #fafafa;
        }
        .collections-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .collections-header h3 {
          margin: 0;
          font-size: 1rem;
          color: #374151;
        }
        .btn-icon {
          width: 28px;
          height: 28px;
          border: none;
          background: #e5e7eb;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1.2rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .btn-icon:hover {
          background: #d1d5db;
        }
        .create-collection-form {
          margin-bottom: 1rem;
          padding: 0.75rem;
          background: white;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
        }
        .create-collection-form input {
          width: 100%;
          padding: 0.5rem;
          margin-bottom: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 0.9rem;
        }
        .color-picker, .icon-picker {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          margin-bottom: 0.5rem;
        }
        .color-option {
          width: 20px;
          height: 20px;
          border-radius: 4px;
          border: 2px solid transparent;
          cursor: pointer;
        }
        .color-option.selected {
          border-color: #1f2937;
        }
        .icon-option {
          width: 24px;
          height: 24px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 1rem;
          border-radius: 4px;
        }
        .icon-option.selected {
          background: #e5e7eb;
        }
        .form-actions {
          display: flex;
          gap: 0.5rem;
        }
        .collections-list {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .collection-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 0.75rem;
          border: none;
          background: transparent;
          border-radius: 6px;
          cursor: pointer;
          text-align: left;
          width: 100%;
          transition: background 0.2s;
        }
        .collection-item:hover {
          background: #f3f4f6;
        }
        .collection-item.active {
          background: #e0e7ff;
        }
        .collection-icon {
          font-size: 1rem;
        }
        .collection-color {
          width: 12px;
          height: 12px;
          border-radius: 3px;
          flex-shrink: 0;
        }
        .collection-name {
          flex: 1;
          font-size: 0.9rem;
          color: #374151;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .collection-item.active .collection-name {
          color: #667eea;
          font-weight: 500;
        }
        .collection-count {
          font-size: 0.75rem;
          color: #9ca3af;
          background: #f3f4f6;
          padding: 0.1rem 0.4rem;
          border-radius: 10px;
        }
        .collection-item.active .collection-count {
          background: #c7d2fe;
          color: #667eea;
        }
        .loading-small {
          text-align: center;
          padding: 1rem;
          color: #9ca3af;
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  );
}

export default CollectionsSidebar;
