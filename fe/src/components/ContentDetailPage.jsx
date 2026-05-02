import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { contentAPI, annotationAPI, collectionAPI } from '../services/api';
import AddToCollectionModal from './AddToCollectionModal';
import { 
  TagChip, 
  DifficultyBadge, 
  ReadingTimeBadge, 
  EnrichmentStatusIndicator,
  CollectionBadge,
  ConfirmModal
} from './common';

/**
 * MetadataSidebar - Clean, minimal metadata display
 */
function MetadataSidebar({ content, onUpdateTags, onAcceptTag, onEnrich, isEnriching }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const input = e.target;
      const newTag = input.value.trim();
      if (newTag && !content.tags.includes(newTag)) {
        onUpdateTags([...content.tags, newTag]);
        input.value = '';
      }
    }
  };

  return (
    <div className="metadata-sidebar">
      {/* Source & Domain */}
      <div className="metadata-section">
        <div className="domain-header">
          {content.favicon_url && (
            <img 
              src={content.favicon_url} 
              alt="" 
              className="favicon"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          )}
          <span className="domain-label">{content.domain}</span>
        </div>
        <a 
          href={content.source_url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="source-link"
        >
          View Original Source ↗
        </a>
      </div>

      {/* Primary Metadata */}
      <div className="metadata-grid">
        <div className="metadata-item">
          <span className="item-label">Reading Time</span>
          <ReadingTimeBadge minutes={content.reading_time_minutes} />
        </div>
        <div className="metadata-item">
          <span className="item-label">Difficulty</span>
          <DifficultyBadge level={content.difficulty} />
        </div>
        <div className="metadata-item">
          <span className="item-label">Word Count</span>
          <span className="item-value mono">{content.word_count?.toLocaleString()} words</span>
        </div>
        <div className="metadata-item">
          <span className="item-label">Saved On</span>
          <span className="item-value">{formatDate(content.created_at)}</span>
        </div>
      </div>

      {/* Collections */}
      <div className="metadata-section">
        <span className="section-label">Collections</span>
        <div className="collections-wrap">
          {content.collections && content.collections.length > 0 ? (
            content.collections.map((col) => (
              <CollectionBadge 
                key={col.id}
                name={col.name} 
                color={col.color}
              />
            ))
          ) : (
            <span className="empty-label">No collections assigned</span>
          )}
        </div>
      </div>

      {/* Tags */}
      <div className="metadata-section">
        <span className="section-label">Tags</span>
        <div className="tags-wrap">
          {content.tags.map((tag) => (
            <TagChip 
              key={tag} 
              label={tag} 
              variant="removable" 
              onRemove={() => onUpdateTags(content.tags.filter(t => t !== tag))}
            />
          ))}
          <input 
            type="text" 
            className="tag-input-minimal" 
            placeholder="+ Add tag..."
            onKeyDown={handleTagKeyDown}
          />
        </div>
      </div>

      {/* AI Insights */}
      {content.summary && (
        <div className="metadata-section ai-insights">
          <div className="section-header">
            <span className="section-label">AI Summary</span>
            <EnrichmentStatusIndicator status="complete" />
          </div>
          <div className="summary-card">
            <p>{content.summary}</p>
          </div>
        </div>
      )}

      {/* Suggested Tags */}
      {content.suggested_tags && content.suggested_tags.length > 0 && (
        <div className="metadata-section">
          <span className="section-label">AI Suggestions</span>
          <div className="tags-wrap">
            {content.suggested_tags.map((tag) => (
              <TagChip 
                key={tag} 
                label={tag} 
                variant="suggested" 
                onAccept={() => onAcceptTag(tag)}
              />
            ))}
          </div>
        </div>
      )}

      <button 
        className="enrich-btn-premium" 
        onClick={onEnrich}
        disabled={isEnriching}
      >
        {isEnriching ? 'Analyzing Content...' : 'Regenerate Insights'}
      </button>
    </div>
  );
}

/**
 * ReadingPane - The core focused reading environment
 */
function ReadingPane({ content, annotations, onCreateAnnotation, onSelectAnnotation, onUpdateProgress, isTruncated }) {
  const [selection, setSelection] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [selectedColor, setSelectedColor] = useState('yellow');
  const [noteText, setNoteText] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [activeHighlightId, setActiveHighlightId] = useState(null);
  const [typography, setTypography] = useState({
    fontSize: 20,
    fontFamily: 'serif',
    lineHeight: 1.7,
    maxWidth: 720
  });

  const contentRef = useRef(null);
  const readingPaneRef = useRef(null);
  const lastUpdateRef = useRef(0);

  const [isSaving, setIsSaving] = useState(false);

  // Robust Selection Handling
  const handleMouseUp = useCallback((e) => {
    const sel = window.getSelection();
    if (sel && sel.toString().trim().length > 0) {
      // Check if selection is within the content area
      if (contentRef.current && !contentRef.current.contains(sel.anchorNode)) {
        setShowTooltip(false);
        return;
      }

      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // Calculate accurate text positions relative to the article's textContent
      // This is more robust than toString() if the DOM has spans/highlights
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(contentRef.current);
      preCaretRange.setEnd(range.startContainer, range.startOffset);
      const startPos = preCaretRange.toString().length;
      const endPos = startPos + sel.toString().length;

      console.log('Selection Captured:', {
        text: sel.toString(),
        start: startPos,
        end: endPos,
        preview: content.body.substring(startPos, endPos)
      });

      setSelection({
        text: sel.toString().trim(),
        positionStart: startPos,
        positionEnd: endPos,
      });

      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.top + window.scrollY - 15,
      });
      setShowTooltip(true);
      setShowNoteInput(false);
      setNoteText('');
    } else {
      // Don't close if clicking inside the tooltip
      if (!e.target.closest('.selection-tooltip-premium')) {
        setShowTooltip(false);
      }
    }
  }, [content.body]);

  // Calculate accurate position in text
  const saveAnnotation = async () => {
    if (!selection || isSaving) return;
    
    setIsSaving(true);
    try {
      console.log('Saving Annotation:', {
        selected_text: selection.text,
        position_start: selection.positionStart,
        position_end: selection.positionEnd
      });

      await onCreateAnnotation({
        selected_text: selection.text,
        note: noteText.trim() || null,
        color: selectedColor,
        position_start: selection.positionStart,
        position_end: selection.positionEnd,
      });
      
      setShowTooltip(false);
      setShowNoteInput(false);
      setSelection(null);
      setNoteText('');
      window.getSelection().removeAllRanges();
    } catch (err) {
      console.error('Failed to save annotation:', err);
      alert('Failed to save highlight. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleScroll = useCallback(() => {
    if (!readingPaneRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = readingPaneRef.current;
    const progress = Math.min(1, Math.max(0, scrollTop / (scrollHeight - clientHeight)));
    
    if (progress > 0.95 && !content.is_read) {
        onUpdateProgress(1.0);
    } else {
        const now = Date.now();
        if (Math.abs(progress - (content.reading_progress || 0)) > 0.05 && now - lastUpdateRef.current > 3000) {
            onUpdateProgress(progress);
            lastUpdateRef.current = now;
        }
    }
  }, [onUpdateProgress, content.reading_progress, content.is_read]);

  const handleHighlightClick = (annotation) => {
    setActiveHighlightId(activeHighlightId === annotation.id ? null : annotation.id);
    onSelectAnnotation(annotation);
  };

  const renderContentWithHighlights = () => {
    if (!content.body) return null;
    if (!annotations || annotations.length === 0) return content.body;

    // Filter annotations that have valid positions and selected_text
    const validAnnotations = annotations.filter(ann => 
      ann.selected_text && 
      typeof ann.position_start === 'number' && 
      typeof ann.position_end === 'number'
    );
    
    if (validAnnotations.length === 0) return content.body;

    const sortedAnnotations = [...validAnnotations].sort((a, b) => a.position_start - b.position_start);
    const parts = [];
    let lastEnd = 0;

    sortedAnnotations.forEach((ann, idx) => {
      // Skip overlapping highlights to prevent DOM corruption
      if (ann.position_start < lastEnd) {
        console.warn('Overlapping highlight skipped:', ann);
        return;
      }

      // Add text before highlight
      if (ann.position_start > lastEnd) {
        parts.push(content.body.slice(lastEnd, ann.position_start));
      }

      // Verify text matches to avoid drift issues
      const actualText = content.body.slice(ann.position_start, ann.position_end);
      
      // Add highlighted text
      parts.push(
        <span 
          key={ann.id || idx}
          className={`reader-highlight highlight-${ann.color} ${activeHighlightId === ann.id ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            handleHighlightClick(ann);
          }}
          title={ann.note || 'Annotation'}
        >
          {actualText || ann.selected_text}
          {ann.note && activeHighlightId === ann.id && (
            <span className="highlight-popup-note">
              {ann.note}
            </span>
          )}
        </span>
      );

      lastEnd = ann.position_end;
    });

    // Add remaining text
    if (lastEnd < content.body.length) {
      parts.push(content.body.slice(lastEnd));
    }

    return parts;
  };

  return (
    <div className="reading-pane-premium" ref={readingPaneRef} onScroll={handleScroll} onMouseUp={handleMouseUp}>
      {/* Progress Bar - Integrated */}
      <div className="premium-progress-container">
        <div 
          className="premium-progress-fill" 
          style={{ width: `${(content.reading_progress || 0) * 100}%` }}
        />
      </div>

      <div className="article-container" style={{ maxWidth: `${typography.maxWidth}px` }}>
        {isTruncated && (
          <div className="premium-banner warning">
            Content truncated. <a href={content.source_url} target="_blank" rel="noreferrer">Open original source ↗</a>
          </div>
        )}

        <header className="premium-header">
          <div className="header-meta">
             <span className="reading-time">{content.reading_time_minutes} min read</span>
             <span className={`status-pill ${content.is_read ? 'read' : 'reading'}`}>
               {content.is_read ? 'Completed' : 'In Progress'}
             </span>
          </div>
          <h1 className="premium-title">{content.title}</h1>
          {content.author && <p className="premium-author">by {content.author}</p>}
        </header>

        <div className="typography-toolbar">
           <button onClick={() => setTypography(t => ({...t, fontFamily: t.fontFamily === 'serif' ? 'sans' : 'serif'}))}>
             {typography.fontFamily === 'serif' ? 'Sans' : 'Serif'}
           </button>
           <div className="divider" />
           <button onClick={() => setTypography(t => ({...t, fontSize: Math.max(16, t.fontSize - 2)}))}>A-</button>
           <button onClick={() => setTypography(t => ({...t, fontSize: Math.min(26, t.fontSize + 2)}))}>A+</button>
           <div className="divider" />
           <button onClick={() => setTypography(t => ({...t, maxWidth: t.maxWidth === 720 ? 960 : 720}))}>
             {typography.maxWidth === 720 ? 'Wide' : 'Narrow'}
           </button>
        </div>

        <article 
          className={`premium-article ${typography.fontFamily}`}
          ref={contentRef}
          style={{ 
              fontSize: `${typography.fontSize}px`,
              lineHeight: typography.lineHeight
          }}
        >
          {renderContentWithHighlights()}
        </article>

        <div className="premium-footer">
          <button 
            className={`complete-btn ${content.is_read ? 'done' : ''}`}
            onClick={() => onUpdateProgress(1.0)}
          >
            {content.is_read ? '✓ Completed' : 'Mark as Complete'}
          </button>
        </div>
      </div>

      {/* Floating Tooltip */}
      {showTooltip && (
        <div 
          className="selection-tooltip-premium"
          style={{ left: tooltipPosition.x, top: tooltipPosition.y }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {!showNoteInput ? (
            <div className="tooltip-inner">
              <button className="tool-btn highlight" onClick={() => setShowNoteInput(true)}>
                Highlight
              </button>
              <div className="tool-divider" />
              <div className="color-selectors">
                {['yellow', 'green', 'pink', 'blue'].map(color => (
                  <button
                    key={color}
                    className={`color-dot ${color} ${selectedColor === color ? 'active' : ''}`}
                    onClick={() => setSelectedColor(color)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="note-input-premium">
              <textarea
                placeholder="Add a thought..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                autoFocus
              />
              <div className="note-actions">
                <button className="note-btn cancel" onClick={() => setShowNoteInput(false)} disabled={isSaving}>Cancel</button>
                <button className="note-btn save" onClick={saveAnnotation} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * AnnotationsSidebar - Glassmorphic sidebar for insights
 */
function AnnotationsSidebar({ annotations, onEdit, onDelete, onExport, onCreateNote }) {
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  const handleAddNote = () => {
    if (newNote.trim()) {
      onCreateNote(newNote);
      setNewNote('');
      setIsAddingNote(false);
    }
  };

  return (
    <div className="annotations-sidebar-premium">
      <div className="sidebar-header">
        <h3>Annotations <span className="count">{annotations.length}</span></h3>
        <div className="header-btns">
          <button className="action-icon" onClick={() => setIsAddingNote(!isAddingNote)}>📝</button>
          <button className="action-icon" onClick={onExport}>📤</button>
        </div>
      </div>

      {isAddingNote && (
        <div className="freeform-note-premium">
          <textarea 
            placeholder="Capture a general thought..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            autoFocus
          />
          <div className="note-footer">
            <button className="btn-text" onClick={() => setIsAddingNote(false)}>Cancel</button>
            <button className="btn-solid" onClick={handleAddNote}>Save</button>
          </div>
        </div>
      )}

      <div className="annotations-scroller">
        {annotations.length === 0 && !isAddingNote ? (
          <div className="empty-annotations">
            <p>No highlights yet.</p>
            <span className="hint">Select text to create an insight.</span>
          </div>
        ) : (
          annotations.map((ann) => (
            <div key={ann.id} className={`ann-card-premium ${!ann.selected_text ? 'note' : ''}`}>
              <div className="ann-card-header">
                {ann.selected_text ? (
                   <div className={`ann-color-dot ${ann.color}`} />
                ) : (
                   <span className="ann-icon">📝</span>
                )}
                <span className="ann-date">{new Date(ann.created_at).toLocaleDateString()}</span>
              </div>
              
              {ann.selected_text && (
                <p className="ann-quote">"{ann.selected_text}"</p>
              )}
              
              {ann.note && (
                <div className="ann-note-body">
                  {ann.note}
                </div>
              )}
              
              <div className="ann-card-actions">
                <button onClick={() => onEdit(ann)}>Edit</button>
                <button className="danger" onClick={() => onDelete(ann.id)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/**
 * ActionBar - Refined bottom control bar
 */
function ActionBar({ onPrevious, onNext, onAddToCollection, onDelete, onToggleZen, isZenMode, hasPrevious, hasNext }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="premium-action-bar">
      <div className="bar-section">
        <button className="bar-btn secondary" onClick={onPrevious} disabled={!hasPrevious}>←</button>
        <button className="bar-btn secondary" onClick={onNext} disabled={!hasNext}>→</button>
      </div>

      <div className="bar-section central">
        <button className="bar-btn accent" onClick={onAddToCollection}>📁 Add to Collection</button>
        <button className="bar-btn" onClick={onToggleZen}>
          {isZenMode ? '📖 Show UI' : '🔕 Zen Mode'}
        </button>
      </div>

      <div className="bar-section">
        <button className="bar-btn" onClick={handleShare}>{copied ? '✓ Copied' : 'Share'}</button>
        <button className="bar-btn danger" onClick={() => setShowDeleteConfirm(true)}>Delete</button>
      </div>

      <ConfirmModal 
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          onDelete();
          setShowDeleteConfirm(false);
        }}
        title="Delete Content"
        message="Are you sure you want to permanently remove this document and all its annotations?"
      />
    </div>
  );
}

/**
 * Main ContentDetailPage - The master layout
 */
function ContentDetailPage({ onDeleteDocument }) {
  const { id: contentId } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [collections, setCollections] = useState([]);
  const [annotations, setAnnotations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnriching, setIsEnriching] = useState(false);
  const [error, setError] = useState(null);
  const [adjacentItems, setAdjacentItems] = useState({ prev: null, next: null });
  const [zenMode, setZenMode] = useState(false);
  const [showAddToCollection, setShowAddToCollection] = useState(false);

  useEffect(() => {
    if (!contentId) return;
    loadData();
  }, [contentId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [contentRes, annRes, collRes] = await Promise.all([
        contentAPI.getById(contentId),
        annotationAPI.getForContent(contentId),
        collectionAPI.getForDocument(contentId),
      ]);

      setContent(contentRes.data);
      setAnnotations(annRes.data.annotations || []);
      setCollections(collRes.data.collections || []);
      
      // Adjacent items disabled - Previous/Next will be unavailable
      setAdjacentItems({
        prev: null,
        next: null,
      });
    } catch (err) {
      setError('Failed to load content experience.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTags = async (newTags) => {
    const res = await contentAPI.update(contentId, { tags: newTags });
    setContent(res.data);
  };

  const handleAcceptTag = async (tag) => {
    const newTags = [...(content.tags || []), tag];
    await contentAPI.update(contentId, { tags: newTags });
    await contentAPI.acceptTags(contentId, [tag]);
    loadData();
  };

  const handleEnrich = async () => {
    setIsEnriching(true);
    await contentAPI.enrich(contentId);
    await loadData();
    setIsEnriching(false);
  };

  const handleCreateAnnotation = async (data) => {
    await annotationAPI.create(contentId, data);
    const annRes = await annotationAPI.getForContent(contentId);
    setAnnotations(annRes.data.annotations || []);
  };

  if (isLoading && !content) return <div className="premium-loader">Initializing Reader...</div>;
  if (error || !content) return <div className="premium-error">{error || 'Experience not found.'}</div>;

  return (
    <div className={`premium-detail-page ${zenMode ? 'zen' : ''}`}>
      <div className="layout-grid">
        {!zenMode && (
          <aside className="sidebar-left">
            <MetadataSidebar 
              content={{...content, collections}}
              onUpdateTags={handleUpdateTags}
              onAcceptTag={handleAcceptTag}
              onEnrich={handleEnrich}
              isEnriching={isEnriching}
            />
          </aside>
        )}

        <main className="main-reader">
          <ReadingPane 
            content={content}
            annotations={annotations}
            onCreateAnnotation={handleCreateAnnotation}
            onSelectAnnotation={(ann) => console.log('Viewing:', ann)}
            onUpdateProgress={async (p) => {
              await contentAPI.updateProgress(contentId, p);
              setContent(prev => ({ ...prev, reading_progress: p, is_read: p >= 1 }));
            }}
            isTruncated={content.is_truncated}
          />
        </main>

        {!zenMode && (
          <aside className="sidebar-right">
            <AnnotationsSidebar 
              annotations={annotations}
              onEdit={async (ann, data) => {
                await annotationAPI.update(ann.id, data);
                const res = await annotationAPI.getForContent(contentId);
                setAnnotations(res.data.annotations || []);
              }}
              onDelete={async (id) => {
                await annotationAPI.delete(id);
                const res = await annotationAPI.getForContent(contentId);
                setAnnotations(res.data.annotations || []);
              }}
              onExport={async () => {
                const res = await annotationAPI.export('markdown');
                const blob = new Blob([res.data], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `smartkeep-insights.md`;
                a.click();
              }}
              onCreateNote={(note) => handleCreateAnnotation({ note })}
            />
          </aside>
        )}
      </div>

      <ActionBar 
        onPrevious={() => navigate(`/app/content/${adjacentItems.prev.id}`)}
        onNext={() => navigate(`/app/content/${adjacentItems.next.id}`)}
        onAddToCollection={() => setShowAddToCollection(true)}
        onDelete={() => onDeleteDocument(contentId)}
        onToggleZen={() => setZenMode(!zenMode)}
        isZenMode={zenMode}
        hasPrevious={!!adjacentItems.prev}
        hasNext={!!adjacentItems.next}
      />

      {showAddToCollection && (
        <AddToCollectionModal
          isOpen={showAddToCollection}
          documentId={contentId}
          documentTitle={content.title}
          onClose={() => setShowAddToCollection(false)}
          onSuccess={loadData}
        />
      )}

      <style>{`
        .premium-detail-page {
          background: #050505;
          height: 100vh;
          display: flex;
          flex-direction: column;
          color: #dde4f0;
          font-family: var(--font-sans);
        }

        .layout-grid {
          display: grid;
          grid-template-columns: 320px 1fr 340px;
          flex: 1;
          overflow: hidden;
          transition: grid-template-columns 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .zen .layout-grid {
          grid-template-columns: 0 1fr 0;
        }

        /* Sidebar Glassmorphism */
        .sidebar-left, .sidebar-right {
          background: rgba(10, 10, 12, 0.8);
          backdrop-filter: blur(20px);
          border-right: 1px solid rgba(255, 255, 255, 0.05);
          overflow-y: auto;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 2.5rem;
        }

        .sidebar-right {
          border-right: none;
          border-left: 1px solid rgba(255, 255, 255, 0.05);
        }

        /* Metadata Premium Styles */
        .domain-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }

        .favicon { width: 20px; height: 20px; border-radius: 4px; }
        .domain-label { font-family: var(--font-mono); font-size: 0.75rem; color: #f5c842; text-transform: uppercase; letter-spacing: 0.1em; }
        .source-link { font-size: 0.85rem; color: var(--text-secondary); }
        .source-link:hover { color: #f5c842; text-decoration: underline; }

        .metadata-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        .metadata-item { display: flex; flex-direction: column; gap: 0.25rem; }
        .item-label { font-family: var(--font-mono); font-size: 0.6rem; text-transform: uppercase; color: var(--text-secondary); letter-spacing: 0.05em; }
        .item-value { font-size: 0.9rem; }
        .item-value.mono { font-family: var(--font-mono); font-size: 0.8rem; }

        .section-label { display: block; font-family: var(--font-mono); font-size: 0.65rem; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 1rem; letter-spacing: 0.1em; }
        
        .collections-wrap, .tags-wrap {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .tag-input-minimal {
          background: transparent;
          border: 1px dashed rgba(255,255,255,0.1);
          border-radius: 20px;
          padding: 4px 12px;
          font-size: 0.8rem;
          color: white;
          outline: none;
          width: 100px;
          transition: width 0.3s;
        }

        .tag-input-minimal:focus { width: 140px; border-color: #f5c842; }

        .summary-card {
          background: rgba(245, 200, 66, 0.03);
          border: 1px solid rgba(245, 200, 66, 0.1);
          padding: 1rem;
          border-radius: 12px;
          font-size: 0.9rem;
          line-height: 1.6;
          color: #dde4f0;
        }

        .enrich-btn-premium {
          width: 100%;
          padding: 1rem;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          color: #f5c842;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }

        .enrich-btn-premium:hover { background: #f5c842; color: #000; }

        /* Reading Pane Premium */
        .main-reader {
          background: #050505;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .reading-pane-premium {
          flex: 1;
          overflow-y: auto;
          padding: 6rem 2rem;
          position: relative;
          scroll-behavior: smooth;
        }

        .premium-progress-container {
          position: fixed;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: rgba(255,255,255,0.05);
          z-index: 1000;
        }

        .premium-progress-fill {
          height: 100%;
          background: #f5c842;
          box-shadow: 0 0 10px rgba(245, 200, 66, 0.5);
          transition: width 0.3s;
        }

        .article-container {
          margin: 0 auto;
          position: relative;
        }

        .premium-header {
          margin-bottom: 4rem;
          text-align: center;
        }

        .header-meta {
          display: flex;
          justify-content: center;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
          font-family: var(--font-mono);
          font-size: 0.75rem;
          text-transform: uppercase;
          color: var(--text-secondary);
        }

        .status-pill {
          padding: 2px 8px;
          border-radius: 4px;
          background: rgba(255,255,255,0.05);
        }

        .status-pill.read { color: #3ecf8e; background: rgba(62, 207, 142, 0.1); }

        .premium-title {
          font-family: var(--font-serif);
          font-size: 3.5rem;
          line-height: 1.1;
          font-weight: 700;
          letter-spacing: -0.04em;
          color: #fff;
          margin-bottom: 1rem;
        }

        .premium-author {
          font-family: var(--font-mono);
          font-size: 0.9rem;
          color: #f5c842;
          font-style: italic;
        }

        .typography-toolbar {
          position: sticky;
          top: -2rem;
          background: rgba(10, 10, 12, 0.8);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.05);
          padding: 0.5rem;
          border-radius: 12px;
          display: flex;
          gap: 0.5rem;
          width: fit-content;
          margin: 0 auto 4rem;
          z-index: 100;
          opacity: 0.4;
          transition: opacity 0.3s;
        }

        .typography-toolbar:hover { opacity: 1; }

        .typography-toolbar button {
          background: transparent;
          border: none;
          color: #fff;
          padding: 6px 12px;
          border-radius: 8px;
          cursor: pointer;
          font-family: var(--font-mono);
          font-size: 0.75rem;
        }

        .typography-toolbar button:hover { background: rgba(255,255,255,0.05); }

        .typography-toolbar .divider { width: 1px; background: rgba(255,255,255,0.1); margin: 4px 0; }

        .premium-article {
          color: #dde4f0;
          line-height: 1.7;
          transition: all 0.3s ease;
        }

        .premium-article.serif { font-family: var(--font-serif); }
        .premium-article.sans { font-family: var(--font-sans); }

        .premium-article p { margin-bottom: 2rem; }

        /* Highlights UX Fixes */
        .reader-highlight {
          position: relative;
          cursor: pointer;
          border-radius: 2px;
          transition: filter 0.2s;
        }

        .reader-highlight:hover { filter: brightness(1.1); }
        
        .highlight-yellow { background: rgba(245, 200, 66, 0.3); border-bottom: 2px solid #f5c842; }
        .highlight-green { background: rgba(62, 207, 142, 0.3); border-bottom: 2px solid #3ecf8e; }
        .highlight-pink { background: rgba(240, 112, 112, 0.3); border-bottom: 2px solid #f07070; }
        .highlight-blue { background: rgba(96, 180, 240, 0.3); border-bottom: 2px solid #60b4f0; }

        .highlight-popup-note {
          position: absolute;
          bottom: 100%; left: 50%;
          transform: translateX(-50%);
          background: #111114;
          border: 1px solid rgba(255,255,255,0.1);
          padding: 0.75rem 1rem;
          border-radius: 8px;
          width: 240px;
          font-size: 0.85rem;
          color: #fff;
          z-index: 500;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          margin-bottom: 10px;
          font-family: var(--font-sans);
          line-height: 1.4;
        }

        /* Tooltip Premium */
        .selection-tooltip-premium {
          position: fixed;
          transform: translate(-50%, -100%);
          background: #111114;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 0.5rem;
          z-index: 2000;
          box-shadow: 0 20px 50px rgba(0,0,0,0.8);
          animation: pop 0.2s cubic-bezier(0.18, 0.89, 0.32, 1.28);
        }

        @keyframes pop { from { opacity: 0; transform: translate(-50%, -80%) scale(0.9); } }

        .tooltip-inner { display: flex; align-items: center; gap: 0.75rem; }
        .tool-btn { background: #f5c842; border: none; color: #000; padding: 6px 14px; border-radius: 8px; font-weight: 600; font-size: 0.8rem; cursor: pointer; }
        .tool-divider { width: 1px; height: 20px; background: rgba(255,255,255,0.1); }
        .color-selectors { display: flex; gap: 6px; }
        .color-dot { width: 16px; height: 16px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; }
        .color-dot.active { border-color: #fff; }
        .color-dot.yellow { background: #f5c842; }
        .color-dot.green { background: #3ecf8e; }
        .color-dot.pink { background: #f07070; }
        .color-dot.blue { background: #60b4f0; }

        .note-input-premium { width: 280px; display: flex; flex-direction: column; gap: 0.75rem; padding: 0.5rem; }
        .note-input-premium textarea { background: #050505; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 0.75rem; color: #fff; resize: none; height: 80px; outline: none; font-family: var(--font-sans); font-size: 0.9rem; }
        .note-actions { display: flex; justify-content: flex-end; gap: 0.5rem; }
        .note-btn { padding: 4px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer; }
        .note-btn.save { background: #f5c842; border: none; color: #000; }
        .note-btn.cancel { background: transparent; border: 1px solid rgba(255,255,255,0.1); color: #fff; }

        /* Annotations Sidebar Premium */
        .annotations-sidebar-premium {
          display: flex;
          flex-direction: column;
          height: 100%;
          gap: 1.5rem;
        }

        .sidebar-header { display: flex; justify-content: space-between; align-items: center; }
        .sidebar-header h3 { font-family: var(--font-serif); font-size: 1.25rem; color: #fff; }
        .count { font-family: var(--font-mono); font-size: 0.8rem; color: #f5c842; background: rgba(245, 200, 66, 0.1); padding: 2px 8px; border-radius: 10px; margin-left: 0.5rem; }
        .header-btns { display: flex; gap: 0.5rem; }
        .action-icon { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); color: #fff; padding: 6px; border-radius: 8px; cursor: pointer; }

        .ann-card-premium { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 1.25rem; border-radius: 16px; display: flex; flex-direction: column; gap: 0.75rem; transition: all 0.2s; }
        .ann-card-premium:hover { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.1); }
        .ann-card-premium.note { border-left: 3px solid #f5c842; }

        .ann-card-header { display: flex; justify-content: space-between; align-items: center; }
        .ann-color-dot { width: 10px; height: 10px; border-radius: 50%; }
        .ann-color-dot.yellow { background: #f5c842; }
        .ann-color-dot.green { background: #3ecf8e; }
        .ann-color-dot.pink { background: #f07070; }
        .ann-color-dot.blue { background: #60b4f0; }
        .ann-date { font-family: var(--font-mono); font-size: 0.65rem; color: var(--text-secondary); }

        .ann-quote { font-family: var(--font-serif); font-size: 0.9rem; font-style: italic; color: #dde4f0; line-height: 1.4; border-left: 2px solid rgba(255,255,255,0.1); padding-left: 0.75rem; }
        .ann-note-body { background: rgba(0,0,0,0.2); padding: 0.75rem; border-radius: 8px; font-size: 0.85rem; line-height: 1.5; color: #f5c842; }

        .ann-card-actions { display: flex; gap: 0.75rem; margin-top: 0.5rem; }
        .ann-card-actions button { background: transparent; border: none; color: var(--text-secondary); font-size: 0.7rem; cursor: pointer; font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.05em; }
        .ann-card-actions button:hover { color: #fff; }
        .ann-card-actions button.danger:hover { color: #f07070; }

        /* Action Bar Premium */
        .premium-action-bar {
          background: rgba(10, 10, 12, 0.9);
          backdrop-filter: blur(20px);
          border-top: 1px solid rgba(255,255,255,0.05);
          padding: 1rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 1000;
        }

        .bar-section { display: flex; gap: 0.75rem; align-items: center; }
        .bar-btn { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); color: #fff; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.85rem; transition: all 0.2s; }
        .bar-btn:hover:not(:disabled) { background: rgba(255,255,255,0.08); }
        .bar-btn.accent { background: #f5c842; color: #000; border: none; font-weight: 600; }
        .bar-btn.danger:hover { background: #f07070; color: #fff; }
        .bar-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        /* Global Clutter Fix */
        .premium-loader { display: flex; align-items: center; justify-content: center; height: 100vh; background: #050505; color: #f5c842; font-family: var(--font-mono); letter-spacing: 0.2em; }
        .premium-error { display: flex; align-items: center; justify-content: center; height: 100vh; background: #050505; color: #f07070; }

        @media (max-width: 1200px) {
          .layout-grid { grid-template-columns: 260px 1fr 280px; }
        }
      `}</style>
    </div>
  );
}

export default ContentDetailPage;
