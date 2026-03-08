import { useState, useEffect, useRef } from 'react';
import { collectionAPI } from '../services/api';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable Collection Card Component
function SortableCollectionCard({ collection, onClick, onEdit, onDelete, isNewCard }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [recentItems, setRecentItems] = useState([]);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: collection?.id || 'new-card' });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    opacity: isDragging ? 0.8 : 1,
  };

  const fetchRecentItems = async () => {
    if (!collection?.id) return;
    try {
      const response = await collectionAPI.getRecentItems(collection.id, 3);
      setRecentItems(response.data.items || []);
    } catch (err) {
      console.error('Failed to fetch recent items:', err);
    }
  };

  const handleMouseEnter = async () => {
    if (isNewCard) return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (rect) {
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10
      });
      setShowTooltip(true);
      await fetchRecentItems();
    }
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (isNewCard) {
    return (
      <div 
        ref={setNodeRef}
        style={style}
        className="collection-card new-collection-card"
        onClick={onClick}
        {...attributes}
        {...listeners}
      >
        <div className="new-card-content">
          <div className="new-icon">+</div>
          <span className="new-label">New Collection</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={(node) => {
        setNodeRef(node);
        cardRef.current = node;
      }}
      style={style}
      className={`collection-card ${isDragging ? 'dragging' : ''}`}
      onClick={() => !isDragging && onClick(collection)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...attributes}
      {...listeners}
    >
      {/* Drag Handle */}
      <div className="drag-handle" title="Drag to reorder">
        ⋮⋮
      </div>

      {/* Preview Images Mosaic */}
      <div className="collection-preview-mosaic">
        {collection.preview_images && collection.preview_images.length > 0 ? (
          collection.preview_images.slice(0, 3).map((img, idx) => (
            <div key={idx} className="preview-image">
              <img src={img} alt="" />
            </div>
          ))
        ) : (
          <div className="preview-placeholder">
            <span className="collection-icon-large">{collection.icon}</span>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="collection-card-content">
        <div className="collection-header">
          <span 
            className="collection-color-swatch" 
            style={{ backgroundColor: collection.color }}
          />
          <span className="collection-icon-small">{collection.icon}</span>
          <h3 className="collection-name">{collection.name}</h3>
        </div>
        
        <div className="collection-meta">
          <span className="item-count">
            {collection.item_count || 0} items
          </span>
          <span className="updated-date">
            Updated {formatDate(collection.updated_at)}
          </span>
        </div>

        {/* Action buttons on hover */}
        <div className="collection-actions">
          <button 
            className="action-btn edit"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(collection);
            }}
            title="Edit collection"
          >
            ✎
          </button>
          <button 
            className="action-btn delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(collection);
            }}
            title="Delete collection"
          >
            ×
          </button>
        </div>
      </div>

      {/* Hover Tooltip */}
      {showTooltip && recentItems.length > 0 && (
        <div 
          className="collection-tooltip"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
          }}
        >
          <div className="tooltip-arrow"></div>
          <div className="tooltip-content">
            <h4>Recent Items</h4>
            <ul>
              {recentItems.map((item, idx) => (
                <li key={idx}>{item.title}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// Main Collections Page Component
function CollectionsPage({ onNavigate, onSelectCollection, refreshTrigger }) {
  const [collections, setCollections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [activeId, setActiveId] = useState(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Create form state
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');
  const [newIcon, setNewIcon] = useState('📁');
  const [newIsPinned, setNewIsPinned] = useState(false);

  const colors = [
    '#6366f1', '#ec4899', '#10b981', '#f59e0b', 
    '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6',
  ];

  const icons = ['📁', '📚', '⭐', '💡', '🔖', '🏷️', '📌', '🗂️', '🎯', '💼', '🎨', '🚀'];

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

  // Separate pinned and regular collections
  const pinnedCollections = collections.filter(c => c.is_pinned);
  const regularCollections = collections.filter(c => !c.is_pinned);

  // Handle drag end
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = regularCollections.findIndex(c => c.id === active.id);
    const newIndex = regularCollections.findIndex(c => c.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newCollections = arrayMove(regularCollections, oldIndex, newIndex);
      setCollections([...pinnedCollections, ...newCollections]);

      // Persist the new order to the backend
      try {
        const orderedIds = newCollections.map(c => c.id);
        await collectionAPI.reorder(orderedIds);
      } catch (err) {
        console.error('Failed to persist reorder:', err);
        // Revert on error
        fetchCollections();
      }
    }
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleCreateCollection = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      await collectionAPI.create(newName, newDescription, newColor, newIcon, newIsPinned);
      setShowCreateModal(false);
      resetForm();
      fetchCollections();
    } catch (err) {
      console.error('Failed to create collection:', err);
    }
  };

  const handleUpdateCollection = async (e) => {
    e.preventDefault();
    if (!selectedCollection || !newName.trim()) return;

    try {
      await collectionAPI.update(selectedCollection.id, {
        name: newName,
        description: newDescription,
        color: newColor,
        icon: newIcon,
        is_pinned: newIsPinned
      });
      setShowEditModal(false);
      setSelectedCollection(null);
      resetForm();
      fetchCollections();
    } catch (err) {
      console.error('Failed to update collection:', err);
    }
  };

  const handleDeleteCollection = async () => {
    if (!selectedCollection) return;

    try {
      await collectionAPI.delete(selectedCollection.id);
      setShowDeleteConfirm(false);
      setSelectedCollection(null);
      fetchCollections();
    } catch (err) {
      console.error('Failed to delete collection:', err);
    }
  };

  const openEditModal = (collection) => {
    setSelectedCollection(collection);
    setNewName(collection.name);
    setNewDescription(collection.description || '');
    setNewColor(collection.color);
    setNewIcon(collection.icon);
    setNewIsPinned(collection.is_pinned);
    setShowEditModal(true);
  };

  const openDeleteConfirm = (collection) => {
    setSelectedCollection(collection);
    setShowDeleteConfirm(true);
  };

  const resetForm = () => {
    setNewName('');
    setNewDescription('');
    setNewColor('#6366f1');
    setNewIcon('📁');
    setNewIsPinned(false);
  };

  const handleCollectionClick = (collection) => {
    if (onSelectCollection) {
      onSelectCollection(collection);
    }
    if (onNavigate) {
      onNavigate('collection-detail', { collection });
    }
  };

  // Find active collection
  const activeCollection = activeId 
    ? collections.find(c => c.id === activeId) 
    : null;

  return (
    <div className="collections-page">
      {/* Page Header */}
      <div className="collections-page-header">
        <h1>Collections</h1>
        <p className="page-description">Organize your saved content into collections</p>
      </div>

      {isLoading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <span>Loading collections...</span>
        </div>
      ) : (
        <>
          {/* Hero Row - Pinned Collections */}
          {pinnedCollections.length > 0 && (
            <section className="collections-hero">
              <h2 className="section-title">Featured Collections</h2>
              <div className="hero-collections">
                {pinnedCollections.slice(0, 3).map(collection => (
                  <div 
                    key={collection.id} 
                    className="hero-collection-card"
                    onClick={() => handleCollectionClick(collection)}
                  >
                    <div 
                      className="hero-card-bg"
                      style={{ backgroundColor: collection.color }}
                    />
                    <div className="hero-card-content">
                      <span className="hero-icon">{collection.icon}</span>
                      <h3>{collection.name}</h3>
                      <p>{collection.item_count || 0} items</p>
                    </div>
                    <div className="hero-preview">
                      {collection.preview_images?.slice(0, 3).map((img, idx) => (
                        <img key={idx} src={img} alt="" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Collections Grid with DnD */}
          <section className="collections-grid-section">
            <h2 className="section-title">All Collections</h2>
            <p className="section-hint">Drag and drop to reorder</p>
            
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={regularCollections.map(c => c.id)}
                strategy={rectSortingStrategy}
              >
                <div className="collections-grid">
                  {/* New Collection Card - Always First */}
                  <SortableCollectionCard 
                    isNewCard={true}
                    onClick={() => setShowCreateModal(true)}
                    collection={{ id: 'new-card' }}
                  />

                  {/* Regular Collection Cards */}
                  {regularCollections.map(collection => (
                    <SortableCollectionCard
                      key={collection.id}
                      collection={collection}
                      onClick={handleCollectionClick}
                      onEdit={openEditModal}
                      onDelete={openDeleteConfirm}
                    />
                  ))}
                </div>
              </SortableContext>

              <DragOverlay>
                {activeCollection ? (
                  <div className="collection-card dragging">
                    <div className="drag-handle">⋮⋮</div>
                    <div className="collection-preview-mosaic">
                      {activeCollection.preview_images && activeCollection.preview_images.length > 0 ? (
                        activeCollection.preview_images.slice(0, 3).map((img, idx) => (
                          <div key={idx} className="preview-image">
                            <img src={img} alt="" />
                          </div>
                        ))
                      ) : (
                        <div className="preview-placeholder">
                          <span className="collection-icon-large">{activeCollection.icon}</span>
                        </div>
                      )}
                    </div>
                    <div className="collection-card-content">
                      <div className="collection-header">
                        <span 
                          className="collection-color-swatch" 
                          style={{ backgroundColor: activeCollection.color }}
                        />
                        <span className="collection-icon-small">{activeCollection.icon}</span>
                        <h3 className="collection-name">{activeCollection.name}</h3>
                      </div>
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </section>

          {/* Empty State */}
          {collections.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📁</div>
              <h3>No collections yet</h3>
              <p>Create your first collection to start organizing your saved content</p>
              <button 
                className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                Create Collection
              </button>
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Collection</h2>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateCollection}>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Collection name"
                  autoFocus
                  required
                />
              </div>
              <div className="form-group">
                <label>Description (optional)</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe this collection"
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Color</label>
                <div className="color-picker">
                  {colors.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`color-option ${newColor === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewColor(color)}
                    />
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Icon</label>
                <div className="icon-picker">
                  {icons.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      className={`icon-option ${newIcon === icon ? 'selected' : ''}`}
                      onClick={() => setNewIcon(icon)}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={newIsPinned}
                    onChange={(e) => setNewIsPinned(e.target.checked)}
                  />
                  Pin to featured section
                </label>
              </div>
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Collection</h2>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <form onSubmit={handleUpdateCollection}>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Collection name"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description (optional)</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe this collection"
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Color</label>
                <div className="color-picker">
                  {colors.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`color-option ${newColor === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewColor(color)}
                    />
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Icon</label>
                <div className="icon-picker">
                  {icons.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      className={`icon-option ${newIcon === icon ? 'selected' : ''}`}
                      onClick={() => setNewIcon(icon)}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={newIsPinned}
                    onChange={(e) => setNewIsPinned(e.target.checked)}
                  />
                  Pin to featured section
                </label>
              </div>
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Collection</h2>
              <button className="close-btn" onClick={() => setShowDeleteConfirm(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete "{selectedCollection?.name}"?</p>
              <p className="warning-text">This will remove all items from this collection, but won't delete the actual content.</p>
            </div>
            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger"
                onClick={handleDeleteCollection}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .collections-page {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
        }

        .collections-page-header {
          margin-bottom: 2rem;
        }

        .collections-page-header h1 {
          font-size: 2rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.5rem;
        }

        .page-description {
          color: #6b7280;
          margin: 0;
        }

        .section-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #374151;
          margin: 0 0 0.5rem;
        }

        .section-hint {
          font-size: 0.85rem;
          color: #9ca3af;
          margin: 0 0 1rem;
        }

        /* Loading State */
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem;
          color: #6b7280;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e5e7eb;
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Hero Section */
        .collections-hero {
          margin-bottom: 2.5rem;
        }

        .hero-collections {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }

        @media (max-width: 900px) {
          .hero-collections {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 600px) {
          .hero-collections {
            grid-template-columns: 1fr;
          }
        }

        .hero-collection-card {
          position: relative;
          height: 200px;
          border-radius: 16px;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .hero-collection-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        }

        .hero-card-bg {
          position: absolute;
          inset: 0;
          opacity: 0.85;
        }

        .hero-card-content {
          position: relative;
          z-index: 1;
          padding: 1.5rem;
          color: white;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .hero-icon {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
        }

        .hero-card-content h3 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 0 0.5rem;
          color: white;
        }

        .hero-card-content p {
          margin: 0;
          opacity: 0.9;
          font-size: 0.9rem;
        }

        .hero-preview {
          position: absolute;
          bottom: 1rem;
          right: 1rem;
          display: flex;
          gap: 0.5rem;
        }

        .hero-preview img {
          width: 50px;
          height: 50px;
          border-radius: 8px;
          object-fit: cover;
          border: 2px solid white;
        }

        /* Collections Grid */
        .collections-grid-section {
          margin-bottom: 2rem;
        }

        .collections-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.25rem;
        }

        @media (max-width: 1200px) {
          .collections-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 900px) {
          .collections-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 600px) {
          .collections-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Collection Card */
        .collection-card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          cursor: grab;
          transition: transform 0.2s, box-shadow 0.2s;
          position: relative;
        }

        .collection-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
        }

        .collection-card:hover .collection-actions {
          opacity: 1;
        }

        .collection-card.dragging {
          cursor: grabbing;
          box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        }

        .drag-handle {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          padding: 0.25rem 0.5rem;
          font-size: 0.9rem;
          color: #9ca3af;
          opacity: 0;
          transition: opacity 0.2s;
          cursor: grab;
          z-index: 10;
        }

        .collection-card:hover .drag-handle {
          opacity: 1;
        }

        /* New Collection Card */
        .new-collection-card {
          border: 2px dashed #d1d5db;
          background: #fafafa;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 180px;
          cursor: pointer;
        }

        .new-collection-card:hover {
          border-color: #6366f1;
          background: #f5f3ff;
        }

        .new-card-content {
          text-align: center;
          color: #6b7280;
        }

        .new-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          margin: 0 auto 0.75rem;
          transition: background 0.2s;
        }

        .new-collection-card:hover .new-icon {
          background: #6366f1;
          color: white;
        }

        .new-label {
          font-size: 0.9rem;
          font-weight: 500;
        }

        /* Preview Mosaic */
        .collection-preview-mosaic {
          height: 120px;
          background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2px;
          padding: 2px;
        }

        .preview-image {
          overflow: hidden;
        }

        .preview-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .preview-placeholder {
          grid-column: span 3;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .collection-icon-large {
          font-size: 3rem;
          opacity: 0.5;
        }

        /* Card Content */
        .collection-card-content {
          padding: 1rem;
        }

        .collection-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .collection-color-swatch {
          width: 12px;
          height: 12px;
          border-radius: 3px;
          flex-shrink: 0;
        }

        .collection-icon-small {
          font-size: 1rem;
        }

        .collection-name {
          font-size: 1rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .collection-meta {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          color: #6b7280;
        }

        /* Action Buttons */
        .collection-actions {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          display: flex;
          gap: 0.25rem;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .action-btn {
          width: 28px;
          height: 28px;
          border: none;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          transition: background 0.2s;
        }

        .action-btn.edit:hover {
          background: #e0e7ff;
        }

        .action-btn.delete:hover {
          background: #fee2e2;
          color: #dc2626;
        }

        /* Tooltip */
        .collection-tooltip {
          position: fixed;
          transform: translate(-50%, -100%);
          z-index: 1000;
          background: #1f2937;
          color: white;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          max-width: 250px;
          animation: tooltipFadeIn 0.2s ease-out;
        }

        @keyframes tooltipFadeIn {
          from {
            opacity: 0;
            transform: translate(-50%, -90%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -100%);
          }
        }

        .tooltip-arrow {
          position: absolute;
          bottom: -6px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 6px solid #1f2937;
        }

        .tooltip-content h4 {
          font-size: 0.75rem;
          font-weight: 600;
          margin: 0 0 0.5rem;
          opacity: 0.7;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .tooltip-content ul {
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .tooltip-content li {
          font-size: 0.85rem;
          padding: 0.25rem 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-state h3 {
          font-size: 1.25rem;
          color: #374151;
          margin: 0 0 0.5rem;
        }

        .empty-state p {
          color: #6b7280;
          margin: 0 0 1.5rem;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal {
          background: white;
          border-radius: 12px;
          width: 100%;
          max-width: 480px;
          max-height: 90vh;
          overflow-y: auto;
          animation: slideUp 0.2s ease-out;
        }

        .modal-sm {
          max-width: 380px;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
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

        .modal form {
          padding: 1.5rem;
        }

        .modal-body {
          padding: 1.5rem;
        }

        .modal-body p {
          margin: 0 0 0.5rem;
          color: #374151;
        }

        .warning-text {
          font-size: 0.85rem;
          color: #6b7280;
        }

        .form-group {
          margin-bottom: 1.25rem;
        }

        .form-group label {
          display: block;
          font-size: 0.9rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .form-group input[type="text"],
        .form-group textarea {
          width: 100%;
          padding: 0.625rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.95rem;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .form-group input[type="text"]:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .color-picker {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .color-option {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 2px solid transparent;
          cursor: pointer;
          transition: transform 0.2s, border-color 0.2s;
        }

        .color-option:hover {
          transform: scale(1.1);
        }

        .color-option.selected {
          border-color: #1f2937;
        }

        .icon-picker {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .icon-option {
          width: 40px;
          height: 40px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          font-size: 1.25rem;
          transition: background 0.2s, border-color 0.2s;
        }

        .icon-option:hover {
          background: #f3f4f6;
        }

        .icon-option.selected {
          background: #e0e7ff;
          border-color: #6366f1;
        }

        .checkbox-group label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }

        .checkbox-group input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .modal-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
          padding-top: 0.5rem;
        }

        .btn {
          padding: 0.625rem 1.25rem;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
          border: none;
        }

        .btn-primary {
          background: #6366f1;
          color: white;
        }

        .btn-primary:hover {
          background: #4f46e5;
        }

        .btn-secondary {
          background: #f3f4f6;
          color: #374151;
        }

        .btn-secondary:hover {
          background: #e5e7eb;
        }

        .btn-danger {
          background: #dc2626;
          color: white;
        }

        .btn-danger:hover {
          background: #b91c1c;
        }
      `}</style>
    </div>
  );
}

export default CollectionsPage;
