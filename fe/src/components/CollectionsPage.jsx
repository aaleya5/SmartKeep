import { useState, useEffect, useRef } from 'react';
import { collectionAPI } from '../services/api';
import './CollectionsPage.css';
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
      const response = await collectionAPI.getContent(collection.id, 1, 3, 'newest');
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
    </div>
  );
}

export default CollectionsPage;
