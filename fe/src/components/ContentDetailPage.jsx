import { useState, useEffect, useRef, useCallback } from 'react';
import { contentAPI, annotationAPI, collectionAPI } from '../services/api';

// Left Sidebar - Metadata
function MetadataSidebar({ content, onUpdateTags, onAcceptTag, onEnrich, isEnriching }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getDifficultyLabel = (difficulty) => {
    if (!difficulty) return null;
    const labels = {
      easy: 'Easy',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
    };
    return labels[difficulty] || difficulty;
  };

  const getDifficultyClass = (difficulty) => {
    if (!difficulty) return '';
    return `difficulty-${difficulty}`;
  };

  const handleTagKeyDown = (e, tagToRemove = null) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const input = e.target;
      const newTag = input.value.trim();
      if (newTag && !content.tags.includes(newTag)) {
        onUpdateTags([...content.tags, newTag]);
        input.value = '';
      }
    } else if (e.key === 'Backspace' && tagToRemove && e.target.value === '') {
      onUpdateTags(content.tags.filter(t => t !== tagToRemove));
    }
  };

  const removeTag = (tagToRemove) => {
    onUpdateTags(content.tags.filter(t => t !== tagToRemove));
  };

  return (
    <div className="metadata-sidebar">
      {/* Source URL */}
      <div className="metadata-section">
        <a 
          href={content.source_url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="source-url"
        >
          {content.source_url}
        </a>
      </div>

      {/* Domain & Favicon */}
      <div className="metadata-row">
        {content.favicon_url && (
          <img 
            src={content.favicon_url} 
            alt="" 
            className="favicon"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        )}
        <span className="domain-name">{content.domain}</span>
      </div>

      {/* Author */}
      {content.author && (
        <div className="metadata-section">
          <span className="metadata-label">Author</span>
          <span className="metadata-value">{content.author}</span>
        </div>
      )}

      {/* Dates */}
      <div className="metadata-section">
        <div className="metadata-row">
          {content.published_at && (
            <>
              <span className="metadata-label">Published:</span>
              <span className="metadata-value">{formatDate(content.published_at)}</span>
            </>
          )}
        </div>
        <div className="metadata-row">
          <span className="metadata-label">Saved:</span>
          <span className="metadata-value">{formatDate(content.created_at)}</span>
        </div>
      </div>

      {/* Reading Time */}
      {content.reading_time_minutes > 0 && (
        <div className="metadata-section">
          <span className="metadata-label">Reading Time</span>
          <span className="metadata-value">{content.reading_time_minutes} min</span>
        </div>
      )}

      {/* Difficulty Badge */}
      {content.difficulty && (
        <div className="metadata-section">
          <span className={`difficulty-badge ${getDifficultyClass(content.difficulty)}`}>
            {getDifficultyLabel(content.difficulty)}
          </span>
        </div>
      )}

      {/* Word Count */}
      {content.word_count && (
        <div className="metadata-section">
          <span className="metadata-label">Word Count</span>
          <span className="metadata-value">{content.word_count.toLocaleString()} words</span>
        </div>
      )}

      {/* Collections */}
      <div className="metadata-section">
        <span className="metadata-label">Collections</span>
        <div className="collections-list">
          {content.collections && content.collections.length > 0 ? (
            content.collections.map((col, idx) => (
              <span key={idx} className="collection-pill">
                {col.name}
              </span>
            ))
          ) : (
            <span className="no-collections">No collections</span>
          )}
        </div>
      </div>

      {/* Tags - Editable */}
      <div className="metadata-section">
        <span className="metadata-label">Tags</span>
        <div className="tags-container">
          {content.tags.map((tag, idx) => (
            <span key={idx} className="tag editable">
              {tag}
              <button 
                className="tag-remove" 
                onClick={() => removeTag(tag)}
                aria-label="Remove tag"
              >
                ×
              </button>
            </span>
          ))}
          <input 
            type="text" 
            className="tag-input" 
            placeholder="+ Add tag"
            onKeyDown={handleTagKeyDown}
          />
        </div>
      </div>

      {/* AI Summary */}
      {content.summary && (
        <div className="metadata-section ai-summary">
          <span className="metadata-label">AI Summary</span>
          <div className="summary-box">
            <p>{content.summary}</p>
          </div>
        </div>
      )}

      {/* Suggested Tags */}
      {content.suggested_tags && content.suggested_tags.length > 0 && (
        <div className="metadata-section">
          <span className="metadata-label">Suggested Tags</span>
          <div className="suggested-tags">
            {content.suggested_tags.map((tag, idx) => (
              <button 
                key={idx} 
                className="suggested-tag"
                onClick={() => onAcceptTag(tag)}
              >
                + {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Enrich Button */}
      <div className="metadata-section">
        <button 
          className="enrich-btn" 
          onClick={onEnrich}
          disabled={isEnriching}
        >
          {isEnriching ? 'Enriching...' : 'Enrich Again'}
        </button>
      </div>
    </div>
  );
}

// Reading Pane - Center
function ReadingPane({ content, annotations, onCreateAnnotation, onSelectAnnotation, onUpdateProgress, isTruncated }) {
  const [selection, setSelection] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [selectedColor, setSelectedColor] = useState('yellow');
  const [noteText, setNoteText] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [activeHighlightId, setActiveHighlightId] = useState(null);
  const contentRef = useRef(null);
  const readingPaneRef = useRef(null);

  // Get approximate text position
  const getTextPosition = (text, selectedText, offset) => {
    const pos = text.indexOf(selectedText);
    return pos >= 0 ? pos : offset;
  };

  // Handle text selection
  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.toString().trim().length > 0) {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelection({
        text: sel.toString().trim(),
        positionStart: getTextPosition(content.body, sel.toString(), range.startOffset),
        positionEnd: getTextPosition(content.body, sel.toString(), range.endOffset),
      });
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
      });
      setShowTooltip(true);
      setShowNoteInput(false);
      setNoteText('');
    } else {
      setShowTooltip(false);
    }
  }, [content.body]);

  // Create highlight/color
  const handleHighlight = () => {
    if (!selection) return;
    setShowNoteInput(true);
  };

  // Save annotation
  const saveAnnotation = () => {
    if (!selection) return;
    onCreateAnnotation({
      selected_text: selection.text,
      note: noteText || null,
      color: selectedColor,
      position_start: selection.positionStart,
      position_end: selection.positionEnd,
    });
    setShowTooltip(false);
    setShowNoteInput(false);
    setSelection(null);
    setNoteText('');
    window.getSelection().removeAllRanges();
  };

  // Handle scroll for reading progress
  const handleScroll = useCallback(() => {
    if (!readingPaneRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = readingPaneRef.current;
    const progress = Math.min(1, Math.max(0, scrollTop / (scrollHeight - clientHeight)));
    if (progress > 0 && progress < 1) {
      onUpdateProgress(progress);
    }
  }, [onUpdateProgress]);

  // Handle click on highlight
  const handleHighlightClick = (annotation) => {
    setActiveHighlightId(activeHighlightId === annotation.id ? null : annotation.id);
    onSelectAnnotation(annotation);
  };

  // Mark as read
  const handleMarkAsRead = () => {
    onUpdateProgress(1);
  };

  // Render content with highlights
  const renderContentWithHighlights = () => {
    if (!content.body || content.body.trim().length === 0) {
      return (
        <div className="no-content-display">
          <div className="no-content-icon">📄</div>
          <h3>Full content unavailable</h3>
          <p>The system was unable to extract the full body text for this document. You can still view the original source.</p>
          <a href={content.source_url} target="_blank" rel="noopener noreferrer" className="btn secondary">
            View Original Source →
          </a>
        </div>
      );
    }

    if (!annotations || annotations.length === 0) {
      return <div className="content-text">{content.body}</div>;
    }

    // Sort annotations by position
    const sortedAnnotations = [...annotations].sort((a, b) => a.position_start - b.position_start);
    const parts = [];
    let lastEnd = 0;

    sortedAnnotations.forEach((ann) => {
      // Add text before this annotation
      if (ann.position_start > lastEnd) {
        parts.push({
          type: 'text',
          content: content.body.slice(lastEnd, ann.position_start),
        });
      }

      // Add highlighted text
      parts.push({
        type: 'highlight',
        content: ann.selected_text,
        color: ann.color,
        annotation: ann,
      });

      lastEnd = ann.position_end || (ann.position_start + ann.selected_text.length);
    });

    // Add remaining text
    if (lastEnd < content.body.length) {
      parts.push({
        type: 'text',
        content: content.body.slice(lastEnd),
      });
    }

    return (
      <div className="content-text">
        {parts.map((part, idx) => 
          part.type === 'highlight' ? (
            <span 
              key={idx}
              className={`highlight highlight-${part.color} ${activeHighlightId === part.annotation.id ? 'active' : ''}`}
              onClick={() => handleHighlightClick(part.annotation)}
              title={part.annotation.note || 'Click to see note'}
            >
              {part.content}
              {part.annotation.note && activeHighlightId === part.annotation.id && (
                <span className="highlight-popover">
                  {part.annotation.note}
                </span>
              )}
            </span>
          ) : (
            <span key={idx}>{part.content}</span>
          )
        )}
      </div>
    );
  };

  return (
    <div className="reading-pane" ref={readingPaneRef} onScroll={handleScroll}>
      {/* Reading Progress Bar */}
      <div className="reading-progress-bar">
        <div 
          className="reading-progress-fill" 
          style={{ width: `${(content.reading_progress || 0) * 100}%` }}
        />
      </div>

      {/* Truncation Banner */}
      {isTruncated && (
        <div className="truncation-banner">
          Content was truncated at 10,000 characters. 
          <a href={content.source_url} target="_blank" rel="noopener noreferrer">
            Open original →
          </a>
        </div>
      )}

      {/* Title */}
      <h1 className="article-title">{content.title}</h1>

      {/* Content */}
      <div 
        className="article-content" 
        ref={contentRef}
        onMouseUp={handleMouseUp}
      >
        {renderContentWithHighlights()}
      </div>

      {/* Floating Tooltip */}
      {showTooltip && (
        <div 
          className="selection-tooltip"
          style={{ 
            left: tooltipPosition.x, 
            top: tooltipPosition.y,
          }}
        >
          {!showNoteInput ? (
            <>
              <button 
                className="tooltip-btn highlight-btn"
                onClick={handleHighlight}
              >
                Highlight
              </button>
              <div className="color-picker">
                {['yellow', 'green', 'pink', 'blue'].map(color => (
                  <button
                    key={color}
                    className={`color-btn color-${color} ${selectedColor === color ? 'active' : ''}`}
                    onClick={() => setSelectedColor(color)}
                    title={color}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="note-input-container">
              <textarea
                className="note-input"
                placeholder="Add a note (optional)..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                autoFocus
              />
              <div className="note-actions">
                <button className="cancel-btn" onClick={() => setShowNoteInput(false)}>
                  Cancel
                </button>
                <button className="save-btn" onClick={saveAnnotation}>
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mark as Read Button */}
      <div className="mark-as-read-container">
        <button 
          className="mark-as-read-btn" 
          onClick={handleMarkAsRead}
          disabled={content.is_read}
        >
          {content.is_read ? '✓ Read' : 'Mark as Read'}
        </button>
      </div>
    </div>
  );
}

// Right Sidebar - Annotations
function AnnotationsSidebar({ annotations, onEdit, onDelete, onExport }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const truncateText = (text, maxLength = 100) => {
    if (!text || text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  return (
    <div className="annotations-sidebar">
      <div className="annotations-header">
        <h3>Annotations ({annotations.length})</h3>
        <button className="export-btn" onClick={onExport}>
          Export
        </button>
      </div>

      <div className="annotations-list">
        {annotations.length === 0 ? (
          <div className="no-annotations">
            <p>No annotations yet.</p>
            <p className="hint">Select text in the article to create highlights and notes.</p>
          </div>
        ) : (
          annotations.map((ann) => (
            <div key={ann.id} className="annotation-card">
              <div className="annotation-header">
                <span 
                  className={`color-indicator color-${ann.color}`}
                />
                <span className="annotation-date">{formatDate(ann.created_at)}</span>
              </div>
              <div className="annotation-quote">
                "{truncateText(ann.selected_text, 80)}"
              </div>
              {ann.note && (
                <div className="annotation-note">
                  {ann.note}
                </div>
              )}
              <div className="annotation-actions">
                <button 
                  className="edit-btn"
                  onClick={() => onEdit(ann)}
                >
                  Edit
                </button>
                <button 
                  className="delete-btn"
                  onClick={() => onDelete(ann.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Bottom Action Bar
function ActionBar({ onPrevious, onNext, onAddToCollection, onDelete, onToggleZen, isZenMode, hasPrevious, hasNext }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    onDelete();
    setShowDeleteConfirm(false);
  };

  return (
    <div className="action-bar">
      <div className="action-bar-inner">
        <div className="nav-buttons">
          <button 
            className="nav-btn" 
            onClick={onPrevious}
            disabled={!hasPrevious}
          >
            ← Previous
          </button>
          <button 
            className="nav-btn" 
            onClick={onNext}
            disabled={!hasNext}
          >
            Next →
          </button>
        </div>

        <div className="action-buttons">
          <button className="action-btn" onClick={onAddToCollection}>
            📁 Add to Collection
          </button>
          <button className="action-btn" onClick={onToggleZen}>
            {isZenMode ? '📖 Show Sidebars' : '🔕 Zen Mode'}
          </button>
          <button className="action-btn" onClick={handleShare}>
            {copied ? '✓ Copied!' : 'Share'}
          </button>
          <button className="action-btn delete" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="delete-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Item?</h3>
            <p>This will permanently delete this item and all its annotations.</p>
            <div className="dialog-buttons">
              <button 
                className="btn secondary"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className="btn danger"
                onClick={confirmDelete}
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

// Main ContentDetailPage Component
function ContentDetailPage({ contentId, onNavigate, onDeleteDocument }) {
  const [content, setContent] = useState(null);
  const [collections, setCollections] = useState([]);
  const [annotations, setAnnotations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnriching, setIsEnriching] = useState(false);
  const [error, setError] = useState(null);
  const [adjacentItems, setAdjacentItems] = useState({ prev: null, next: null });
  const [zenMode, setZenMode] = useState(false);

  // Load content and annotations
  useEffect(() => {
    loadContent();
    loadCollections();
    loadAnnotations();
    loadAdjacentItems();
  }, [contentId]);

  const loadContent = async () => {
    try {
      const response = await contentAPI.getById(contentId);
      setContent(response.data);
    } catch (err) {
      setError('Failed to load content');
      console.error(err);
    }
  };

  const loadCollections = async () => {
    try {
      const response = await collectionAPI.getForDocument(contentId);
      setCollections(response.data.collections || []);
    } catch (err) {
      console.error('Failed to load collections:', err);
    }
  };

  const loadAnnotations = async () => {
    try {
      setIsLoading(true);
      const response = await annotationAPI.getForContent(contentId);
      setAnnotations(response.data.annotations || []);
    } catch (err) {
      console.error('Failed to load annotations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAdjacentItems = async () => {
    try {
      // Get all items to determine prev/next
      const response = await contentAPI.getList({ page_size: 100, sort: 'last_opened' });
      const items = response.data.items || [];
      const currentIndex = items.findIndex(item => item.id === contentId);
      
      setAdjacentItems({
        prev: currentIndex > 0 ? items[currentIndex - 1] : null,
        next: currentIndex < items.length - 1 ? items[currentIndex + 1] : null,
      });
    } catch (err) {
      console.error('Failed to load adjacent items:', err);
    }
  };

  const handleUpdateTags = async (newTags) => {
    try {
      const response = await contentAPI.update(contentId, { tags: newTags });
      setContent(response.data);
    } catch (err) {
      console.error('Failed to update tags:', err);
    }
  };

  const handleAcceptTag = async (tag) => {
    try {
      const newTags = [...(content.tags || []), tag];
      const response = await contentAPI.update(contentId, { tags: newTags });
      setContent(response.data);
      // Also accept in suggested tags
      await contentAPI.acceptTags(contentId, [tag]);
      loadContent();
    } catch (err) {
      console.error('Failed to accept tag:', err);
    }
  };

  const handleEnrich = async () => {
    setIsEnriching(true);
    try {
      await contentAPI.enrich(contentId);
      await loadContent();
    } catch (err) {
      console.error('Failed to enrich:', err);
    } finally {
      setIsEnriching(false);
    }
  };

  const handleCreateAnnotation = async (annotationData) => {
    try {
      await annotationAPI.create(contentId, annotationData);
      loadAnnotations();
    } catch (err) {
      console.error('Failed to create annotation:', err);
    }
  };

  const handleUpdateAnnotation = async (annotationId, data) => {
    try {
      await annotationAPI.update(annotationId, data);
      loadAnnotations();
    } catch (err) {
      console.error('Failed to update annotation:', err);
    }
  };

  const handleDeleteAnnotation = async (annotationId) => {
    try {
      await annotationAPI.delete(annotationId);
      loadAnnotations();
    } catch (err) {
      console.error('Failed to delete annotation:', err);
    }
  };

  const handleExportAnnotations = async () => {
    try {
      const response = await annotationAPI.export('markdown');
      const blob = new Blob([response.data], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `annotations-${content.title.slice(0, 30)}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export annotations:', err);
    }
  };

  const handleUpdateProgress = async (progress) => {
    try {
      await contentAPI.updateProgress(contentId, progress);
      setContent(prev => ({ ...prev, reading_progress: progress, is_read: progress >= 1 }));
    } catch (err) {
      console.error('Failed to update progress:', err);
    }
  };

  const handleNavigatePrevious = () => {
    if (adjacentItems.prev) {
      onNavigate('content-detail', { selectedItem: adjacentItems.prev.id });
    }
  };

  const handleNavigateNext = () => {
    if (adjacentItems.next) {
      onNavigate('content-detail', { selectedItem: adjacentItems.next.id });
    }
  };

  const handleAddToCollection = () => {
    onNavigate('add-to-collection', { documentId: contentId });
  };

  const handleShare = () => {
    const url = `${window.location.origin}/content/${contentId}`;
    navigator.clipboard.writeText(url);
  };

  const handleDelete = async () => {
    try {
      await contentAPI.delete(contentId);
      onDeleteDocument && onDeleteDocument(contentId);
      onNavigate('documents');
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  if (isLoading && !content) {
    return (
      <div className="content-detail-loading">
        <div className="spinner"></div>
        <span>Loading...</span>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="content-detail-error">
        <p>{error || 'Content not found'}</p>
        <button onClick={() => onNavigate('documents')}>Back to Library</button>
      </div>
    );
  }

  return (
    <div className={`content-detail-page ${zenMode ? 'zen-mode' : ''}`}>
      <div className="content-detail-layout">
        {/* Left Sidebar - Metadata */}
        {!zenMode && (
          <aside className="left-sidebar">
            <MetadataSidebar 
              content={{...content, collections}}
              onUpdateTags={handleUpdateTags}
              onAcceptTag={handleAcceptTag}
              onEnrich={handleEnrich}
              isEnriching={isEnriching}
            />
          </aside>
        )}

        {/* Center - Reading Pane */}
        <main className="center-pane">
          {content.body ? (
            <ReadingPane 
              content={content}
              annotations={annotations}
              onCreateAnnotation={handleCreateAnnotation}
              onSelectAnnotation={(ann) => console.log('Selected:', ann)}
              onUpdateProgress={handleUpdateProgress}
              isTruncated={content.is_truncated}
            />
          ) : (
            <div className="empty-state">No content available to read.</div>
          )}
        </main>

        {/* Right Sidebar - Annotations */}
        {!zenMode && (
          <aside className="right-sidebar">
            <AnnotationsSidebar 
              annotations={annotations}
              onEdit={handleUpdateAnnotation}
              onDelete={handleDeleteAnnotation}
              onExport={handleExportAnnotations}
            />
          </aside>
        )}
      </div>

      {/* Bottom Action Bar */}
      <ActionBar 
        onPrevious={handleNavigatePrevious}
        onNext={handleNavigateNext}
        onAddToCollection={handleAddToCollection}
        onShare={handleShare}
        onDelete={handleDelete}
        onToggleZen={() => setZenMode(!zenMode)}
        isZenMode={zenMode}
        hasPrevious={!!adjacentItems.prev}
        hasNext={!!adjacentItems.next}
      />

      <style>{`
        .content-detail-page {
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow: hidden;
          background: var(--bg-color);
        }

        .content-detail-layout {
          display: grid;
          grid-template-columns: 260px 1fr 280px;
          gap: 0;
          flex: 1;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .zen-mode .content-detail-layout {
          grid-template-columns: 1fr;
        }

        /* Left Sidebar */
        .left-sidebar {
          background: var(--bg-secondary);
          border-right: 1px solid var(--border-color);
          overflow-y: auto;
          padding: 1.5rem;
        }

        .metadata-sidebar {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .metadata-section {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .metadata-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .metadata-label {
          font-family: var(--font-mono);
          font-size: 0.65rem;
          font-weight: 500;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .metadata-value {
          font-size: 0.85rem;
          color: var(--text-color);
        }

        .source-url {
          font-size: 0.75rem;
          color: #667eea;
          text-decoration: none;
          word-break: break-all;
          line-height: 1.4;
        }

        .source-url:hover {
          text-decoration: underline;
        }

        .favicon {
          width: 16px;
          height: 16px;
          border-radius: 2px;
        }

        .domain-name {
          font-size: 0.85rem;
          color: #667eea;
        }

        .difficulty-badge {
          display: inline-block;
          font-size: 0.7rem;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-weight: 500;
        }

        .difficulty-easy { background: #d1fae5; color: #059669; }
        .difficulty-intermediate { background: #fef3c7; color: #d97706; }
        .difficulty-advanced { background: #fee2e2; color: #dc2626; }

        .collections-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
        }

        .collection-pill {
          font-size: 0.7rem;
          padding: 0.2rem 0.5rem;
          background: #e0e7ff;
          color: #667eea;
          border-radius: 12px;
        }

        .no-collections {
          font-size: 0.8rem;
          color: #9ca3af;
          font-style: italic;
        }

        .tags-container {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
          align-items: center;
        }

        .tag {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.7rem;
          padding: 0.2rem 0.5rem;
          background: #e0e7ff;
          color: #667eea;
          border-radius: 12px;
        }

        .tag.editable {
          padding-right: 0.2rem;
        }

        .tag-remove {
          background: none;
          border: none;
          color: #667eea;
          cursor: pointer;
          font-size: 0.9rem;
          padding: 0 0.2rem;
          line-height: 1;
        }

        .tag-remove:hover {
          color: #dc2626;
        }

        .tag-input {
          font-size: 0.75rem;
          padding: 0.2rem 0.4rem;
          border: 1px dashed #d1d5db;
          border-radius: 12px;
          width: 70px;
          background: transparent;
        }

        .tag-input:focus {
          outline: none;
          border-color: #667eea;
        }

        .ai-summary {
          background: rgba(245, 200, 66, 0.05);
          border: 1px solid rgba(245, 200, 66, 0.1);
          border-radius: 8px;
          padding: 1rem;
        }

        .summary-box p {
          font-size: 0.85rem;
          color: var(--text-color);
          line-height: 1.6;
          margin: 0;
        }

        .suggested-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
        }

        .suggested-tag {
          font-size: 0.65rem;
          padding: 0.2rem 0.4rem;
          background: #f3f4f6;
          color: #9ca3af;
          border: 1px dashed #d1d5db;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .suggested-tag:hover {
          background: #e0e7ff;
          color: #667eea;
          border-color: #667eea;
        }

        .enrich-btn {
          width: 100%;
          padding: 0.5rem;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.85rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .enrich-btn:hover:not(:disabled) {
          background: #5568d3;
        }

        .enrich-btn:disabled {
          background: #a5b4fc;
          cursor: not-allowed;
        }

        /* Center Pane */
        .center-pane {
          background: var(--bg-color);
          overflow-y: auto;
          padding: 4rem 10% 8rem;
          scroll-behavior: smooth;
        }

        .reading-progress-bar {
          position: fixed;
          top: 60px;
          left: 280px;
          right: 300px;
          height: 3px;
          background: #e5e7eb;
          z-index: 100;
        }

        .reading-progress-fill {
          height: 100%;
          background: #667eea;
          transition: width 0.1s;
        }

        .truncation-banner {
          background: #fef3c7;
          color: #92400e;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          font-size: 0.85rem;
        }

        .truncation-banner a {
          color: #667eea;
          margin-left: 0.5rem;
        }

        .article-title {
          font-family: var(--font-serif);
          font-size: 2.5rem;
          font-weight: 900;
          color: var(--text-color);
          margin: 0 0 2rem;
          line-height: 1.1;
          letter-spacing: -0.03em;
        }

        .article-content {
          font-size: 1.2rem;
          line-height: 1.8;
          color: var(--text-color);
          user-select: text;
          max-width: 800px;
          margin: 0 auto;
        }

        .content-text {
          white-space: pre-wrap;
        }

        .highlight {
          cursor: pointer;
          border-radius: 2px;
          padding: 1px 0;
          position: relative;
        }

        .highlight-yellow { background: #fef08a; }
        .highlight-green { background: #bbf7d0; }
        .highlight-pink { background: #fbcfe8; }
        .highlight-blue { background: #bfdbfe; }

        .highlight.active .highlight-popover {
          display: block;
        }

        .highlight-popover {
          display: none;
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: #1f2937;
          color: white;
          padding: 0.5rem 0.75rem;
          border-radius: 6px;
          font-size: 0.8rem;
          white-space: nowrap;
          z-index: 50;
          margin-bottom: 8px;
          max-width: 250px;
          white-space: normal;
        }

        .highlight-popover::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 6px solid transparent;
          border-top-color: #1f2937;
        }

        /* Selection Tooltip */
        .selection-tooltip {
          position: fixed;
          transform: translate(-50%, -100%);
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          padding: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          z-index: 1000;
        }

        .tooltip-btn {
          padding: 0.35rem 0.75rem;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 0.8rem;
          cursor: pointer;
        }

        .color-picker {
          display: flex;
          gap: 0.25rem;
        }

        .color-btn {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid transparent;
          cursor: pointer;
        }

        .color-btn.active {
          border-color: #1f2937;
        }

        .color-yellow { background: #fef08a; }
        .color-green { background: #bbf7d0; }
        .color-pink { background: #fbcfe8; }
        .color-blue { background: #bfdbfe; }

        .note-input-container {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          min-width: 200px;
        }

        .note-input {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          font-size: 0.85rem;
          resize: vertical;
          min-height: 60px;
        }

        .note-input:focus {
          outline: none;
          border-color: #667eea;
        }

        .note-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
        }

        .note-actions button {
          padding: 0.35rem 0.75rem;
          border-radius: 4px;
          font-size: 0.8rem;
          cursor: pointer;
        }

        .cancel-btn {
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          color: #374151;
        }

        .save-btn {
          background: #667eea;
          border: none;
          color: white;
        }

        .mark-as-read-container {
          margin-top: 2rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
        }

        .mark-as-read-btn {
          padding: 0.75rem 1.5rem;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.9rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .mark-as-read-btn:hover:not(:disabled) {
          background: #059669;
        }

        .mark-as-read-btn:disabled {
          background: #9ca3af;
          cursor: default;
        }

        /* Right Sidebar */
        .right-sidebar {
          background: var(--bg-secondary);
          border-left: 1px solid var(--border-color);
          overflow-y: auto;
          padding: 1.5rem;
        }

        .annotations-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .annotations-header h3 {
          font-family: var(--font-serif);
          font-size: 1rem;
          color: var(--text-color);
          margin: 0;
        }

        .export-btn {
          padding: 0.35rem 0.75rem;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: 4px;
          font-size: 0.8rem;
          color: var(--text-color);
          cursor: pointer;
        }

        .export-btn:hover {
          background: #f3f4f6;
        }

        .annotations-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .no-annotations {
          text-align: center;
          padding: 2rem 1rem;
          color: #9ca3af;
        }

        .no-annotations p {
          margin: 0 0 0.5rem;
        }

        .no-annotations .hint {
          font-size: 0.8rem;
        }

        .annotation-card {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 0.75rem;
          box-shadow: var(--shadow-sm);
        }

        .annotation-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .color-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .color-indicator.color-yellow { background: #fef08a; }
        .color-indicator.color-green { background: #bbf7d0; }
        .color-indicator.color-pink { background: #fbcfe8; }
        .color-indicator.color-blue { background: #bfdbfe; }

        .annotation-date {
          font-size: 0.7rem;
          color: #9ca3af;
        }

        .annotation-quote {
          font-size: 0.85rem;
          color: var(--text-color);
          font-style: italic;
          line-height: 1.4;
          margin-bottom: 0.5rem;
        }

        .annotation-note {
          font-size: 0.8rem;
          color: var(--text-secondary);
          background: var(--bg-secondary);
          padding: 0.5rem;
          border-radius: 4px;
          margin-bottom: 0.5rem;
        }

        .annotation-actions {
          display: flex;
          gap: 0.5rem;
        }

        .edit-btn, .delete-btn {
          padding: 0.25rem 0.5rem;
          font-size: 0.7rem;
          border-radius: 4px;
          cursor: pointer;
        }

        .edit-btn {
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          color: #374151;
        }

        .delete-btn {
          background: #fee2e2;
          border: 1px solid #fecaca;
          color: #dc2626;
        }

        /* Action Bar */
        .action-bar {
          background: var(--bg-secondary);
          border-top: 1px solid var(--border-color);
          padding: 1rem 2rem;
          position: sticky;
          bottom: 0;
          backdrop-filter: blur(10px);
        }

        .action-bar-inner {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .nav-buttons, .action-buttons {
          display: flex;
          gap: 0.75rem;
        }

        .nav-btn, .action-btn {
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .nav-btn {
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          color: #374151;
        }

        .nav-btn:hover:not(:disabled) {
          background: #e5e7eb;
        }

        .nav-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .action-btn {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          color: var(--text-color);
        }

        .action-btn:hover {
          background: #f3f4f6;
        }

        .action-btn.delete {
          color: #dc2626;
          border-color: #fecaca;
        }

        .action-btn.delete:hover {
          background: #fee2e2;
        }

        /* Delete Confirmation Modal */
        .delete-confirm-dialog {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          padding: 2rem;
          border-radius: 16px;
          max-width: 400px;
          box-shadow: var(--shadow-lg);
        }

        .delete-confirm-dialog h3 {
          margin: 0 0 0.5rem;
          color: #1f2937;
        }

        .delete-confirm-dialog p {
          color: #6b7280;
          margin-bottom: 1rem;
        }

        .btn.danger {
          background: #dc2626;
          color: white;
          border: none;
        }

        .btn.danger:hover {
          background: #b91c1c;
        }

        /* Loading & Error States */
        .content-detail-loading, .content-detail-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: calc(100vh - 60px);
          gap: 1rem;
          color: #6b7280;
        }

        .content-detail-error button {
          padding: 0.5rem 1rem;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }

        /* Dark mode support */
        .app.dark-mode .left-sidebar,
        .app.dark-mode .right-sidebar {
          background: #1f2937;
          border-color: #374151;
        }

        .app.dark-mode .metadata-label {
          color: #6b7280;
        }

        .app.dark-mode .metadata-value,
        .app.dark-mode .domain-name {
          color: #d1d5db;
        }

        .app.dark-mode .ai-summary {
          background: #374151;
        }

        .app.dark-mode .summary-box p {
          color: #d1d5db;
        }

        .app.dark-mode .tag,
        .app.dark-mode .collection-pill {
          background: #4f46e5;
          color: #e0e7ff;
        }

        .app.dark-mode .suggested-tag {
          background: #374151;
          color: #6b7280;
          border-color: #4b5563;
        }

        .app.dark-mode .center-pane {
          background: #111827;
        }

        .app.dark-mode .article-title {
          color: #f3f4f6;
        }

        .app.dark-mode .article-content {
          color: #d1d5db;
        }

        .app.dark-mode .reading-progress-bar {
          background: #374151;
        }

        .app.dark-mode .annotation-card {
          background: #374151;
        }

        .app.dark-mode .annotation-quote {
          color: #d1d5db;
        }

        .app.dark-mode .annotation-note {
          background: #1f2937;
          color: #9ca3af;
        }

        .app.dark-mode .action-bar {
          background: #1f2937;
          border-color: #374151;
        }

        .app.dark-mode .nav-btn,
        .app.dark-mode .action-btn {
          background: #374151;
          border-color: #4b5563;
          color: #d1d5db;
        }

        .app.dark-mode .selection-tooltip {
          background: #1f2937;
        }

        .no-content-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          text-align: center;
          background: var(--bg-secondary);
          border-radius: var(--border-radius-lg);
          border: 1px dashed var(--border-color);
          margin-top: 2rem;
        }

        .no-content-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .no-content-display h3 {
          margin-bottom: 0.5rem;
          color: var(--text-color);
        }

        .no-content-display p {
          color: var(--text-secondary);
          max-width: 400px;
          margin-bottom: 1.5rem;
          font-size: 0.9rem;
        }

        /* Responsive */
        @media (max-width: 1200px) {
          .content-detail-layout {
            grid-template-columns: 240px 1fr 250px;
          }
        }

        @media (max-width: 1024px) {
          .content-detail-layout {
            grid-template-columns: 1fr;
          }

          .left-sidebar, .right-sidebar {
            display: none;
          }

          .reading-progress-bar {
            left: 0;
            right: 0;
          }
        }
      `}</style>
    </div>
  );
}

export default ContentDetailPage;
