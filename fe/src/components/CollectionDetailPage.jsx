import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collectionAPI } from '../services/api';
import Library from './Library';
import { Trash2, Edit3, Plus, ChevronLeft } from 'lucide-react';

function CollectionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [collection, setCollection] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '', color: '', icon: '' });

  const fetchCollection = async () => {
    setIsLoading(true);
    try {
      const response = await collectionAPI.get(id);
      setCollection(response.data);
      setEditForm({
        name: response.data.name,
        description: response.data.description || '',
        color: response.data.color,
        icon: response.data.icon
      });
    } catch (err) {
      console.error('Failed to fetch collection:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCollection();
  }, [id]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await collectionAPI.update(id, editForm);
      setIsEditing(false);
      fetchCollection();
    } catch (err) {
      console.error('Failed to update collection:', err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this collection? Content will not be deleted.')) return;
    try {
      await collectionAPI.delete(id);
      navigate('/app/collections');
    } catch (err) {
      console.error('Failed to delete collection:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="loading-state" style={{ padding: '80px', textAlign: 'center' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Loading collection...</p>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="error-state" style={{ padding: '80px', textAlign: 'center' }}>
        <h2>Collection not found</h2>
        <button className="btn btn-primary" onClick={() => navigate('/app/collections')}>Back to Collections</button>
      </div>
    );
  }

  return (
    <div className="collection-detail-container">
      <header className="collection-detail-header" style={{ 
        padding: '2rem 2rem 0', 
        borderBottom: '1px solid var(--border-color)',
        background: `linear-gradient(180deg, ${collection.color}15 0%, transparent 100%)`
      }}>
        <button 
            className="back-link" 
            onClick={() => navigate('/app/collections')}
            style={{ 
                background: 'none', border: 'none', color: 'var(--text-secondary)', 
                display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                marginBottom: '1.5rem', fontSize: '0.9rem'
            }}
        >
          <ChevronLeft size={16} /> Back to Collections
        </button>

        <div className="collection-info-main" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <div className="collection-large-icon" style={{ 
              fontSize: '2.5rem', width: '80px', height: '80px', 
              background: 'var(--bg-secondary)', borderRadius: '20px',
              display: 'flex', alignItems: 'center', justifyCenter: 'center',
              border: `2px solid ${collection.color}`
            }}>
                <div style={{ margin: 'auto' }}>{collection.icon}</div>
            </div>
            <div>
              {isEditing ? (
                <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <input 
                    className="sleek-input"
                    value={editForm.name}
                    onChange={e => setEditForm({...editForm, name: e.target.value})}
                    style={{ fontSize: '1.5rem', fontWeight: 'bold' }}
                  />
                  <textarea 
                    className="sleek-textarea"
                    value={editForm.description}
                    onChange={e => setEditForm({...editForm, description: e.target.value})}
                    placeholder="Add description..."
                  />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="submit" className="btn btn-primary btn-sm">Save</button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsEditing(false)}>Cancel</button>
                  </div>
                </form>
              ) : (
                <>
                  <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{collection.name}</h1>
                  <p style={{ color: 'var(--text-secondary)', maxWidth: '600px' }}>{collection.description || 'No description provided.'}</p>
                </>
              )}
            </div>
          </div>

          <div className="collection-header-actions" style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={() => setIsEditing(!isEditing)}>
              <Edit3 size={16} /> Edit
            </button>
            <button className="btn btn-danger" onClick={handleDelete}>
              <Trash2 size={16} /> Delete
            </button>
          </div>
        </div>
      </header>

      <div className="collection-content">
        <Library 
          collectionId={id}
          onSelectDocument={(doc) => navigate(`/app/content/${doc.id}`)}
          onRefresh={fetchCollection}
        />
      </div>

      <style>{`
        .collection-detail-container {
            min-height: 100vh;
        }
        .collection-large-icon {
            box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        }
        .sleek-input, .sleek-textarea {
            background: var(--bg-tertiary);
            border: 1px solid var(--border-color);
            color: var(--text-color);
            padding: 8px 12px;
            border-radius: 8px;
            width: 100%;
        }
        .btn-sm {
            padding: 4px 12px;
            font-size: 0.8rem;
        }
      `}</style>
    </div>
  );
}

export default CollectionDetailPage;
