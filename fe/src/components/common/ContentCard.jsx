import { useState } from 'react';

/**
 * ContentCard - Reusable card component for displaying saved content
 * 
 * Props:
 * - title: string - Title of the content
 * - domain: string - Domain name
 * - favicon: string - URL to favicon
 * - ogImage: string - URL to Open Graph image
 * - summary: string - AI generated summary
 * - tags: string[] - Array of tags
 * - readingTime: number - Reading time in minutes
 * - difficulty: 'easy' | 'intermediate' | 'advanced' - Difficulty level
 * - savedDate: Date - When the content was saved
 * - isTruncated: boolean - Whether content is truncated
 * - enrichmentStatus: 'pending' | 'processing' | 'complete' | 'failed' - AI enrichment status
 * - onTagClick: (tag: string) => void - Tag click handler
 * - onAddToCollection: () => void - Add to collection handler
 * - onDelete: () => void - Delete handler
 * - variant: 'grid' | 'list' | 'compact' | 'preview' - Card variant
 */

export default function ContentCard({
  title,
  domain,
  favicon,
  ogImage,
  summary,
  tags = [],
  readingTime,
  difficulty,
  savedDate,
  isTruncated = false,
  enrichmentStatus = 'complete',
  onTagClick,
  onAddToCollection,
  onDelete,
  variant = 'grid'
}) {
  const [imageError, setImageError] = useState(false);
  
  const getDifficultyConfig = (level) => {
    switch (level) {
      case 'easy':
        return { label: 'Easy', color: '#22c55e', icon: '📖' };
      case 'intermediate':
        return { label: 'Intermediate', color: '#f59e0b', icon: '📖📖' };
      case 'advanced':
        return { label: 'Advanced', color: '#ef4444', icon: '📖📖📖' };
      default:
        return null;
    }
  };
  
  const formatReadingTime = (minutes) => {
    if (!minutes) return null;
    if (minutes < 1) return '< 1 min read';
    if (minutes === 1) return '1 min read';
    return `~${Math.round(minutes)} min read`;
  };
  
  const formatDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  const difficultyConfig = getDifficultyConfig(difficulty);
  
  // Preview variant (sidebar)
  if (variant === 'preview') {
    return (
      <div className="content-card-preview">
        <div className="preview-header">
          {favicon && (
            <img 
              src={favicon} 
              alt="" 
              className="preview-favicon"
              onError={(e) => e.target.style.display = 'none'}
            />
          )}
          <span className="preview-domain">{domain}</span>
        </div>
        <h4 className="preview-title">{title}</h4>
        {summary && (
          <p className="preview-summary">{summary.substring(0, 100)}...</p>
        )}
      </div>
    );
  }
  
  // Compact variant
  if (variant === 'compact') {
    return (
      <div className="content-card-compact">
        <div className="compact-content">
          <h4 className="compact-title">{title}</h4>
          <div className="compact-meta">
            {domain && <span className="compact-domain">{domain}</span>}
            {readingTime && <span className="compact-reading-time">· {formatReadingTime(readingTime)}</span>}
          </div>
        </div>
        <div className="compact-actions">
          {onAddToCollection && (
            <button 
              className="compact-action-btn" 
              onClick={onAddToCollection}
              title="Add to collection"
            >
              📁
            </button>
          )}
          {onDelete && (
            <button 
              className="compact-action-btn delete" 
              onClick={onDelete}
              title="Delete"
            >
              🗑️
            </button>
          )}
        </div>
      </div>
    );
  }
  
  // List variant
  if (variant === 'list') {
    return (
      <div className="content-card-list">
        <div className="list-content">
          <div className="list-header">
            <h3 className="list-title">{title}</h3>
            {enrichmentStatus === 'processing' && (
              <span className="enrichment-badge processing">⏳ Processing...</span>
            )}
            {enrichmentStatus === 'failed' && (
              <button className="enrichment-badge failed" title="Auto-summary failed. Click to retry.">
                ⚠️
              </button>
            )}
          </div>
          
          <div className="list-meta">
            {domain && <span className="list-domain">{domain}</span>}
            {readingTime && <span className="list-reading-time">· {formatReadingTime(readingTime)}</span>}
            {difficultyConfig && (
              <span 
                className="list-difficulty"
                style={{ color: difficultyConfig.color }}
              >
                · {difficultyConfig.icon} {difficultyConfig.label}
              </span>
            )}
            {savedDate && <span className="list-date">· Saved {formatDate(savedDate)}</span>}
          </div>
          
          {summary && (
            <p className="list-summary">
              <strong>Summary:</strong> {summary}
            </p>
          )}
          
          {tags.length > 0 && (
            <div className="list-tags">
              {tags.map((tag, idx) => (
                <button 
                  key={idx} 
                  className="tag-chip"
                  onClick={() => onTagClick?.(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="list-actions">
          {ogImage && !imageError && (
            <img 
              src={ogImage} 
              alt="" 
              className="list-image"
              onError={() => setImageError(true)}
            />
          )}
          <div className="action-buttons">
            {onAddToCollection && (
              <button 
                className="action-btn" 
                onClick={onAddToCollection}
                title="Add to collection"
              >
                📁
              </button>
            )}
            {onDelete && (
              <button 
                className="action-btn delete" 
                onClick={onDelete}
                title="Delete"
              >
                🗑️
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // Grid variant (default)
  return (
    <div className="content-card-grid">
      {ogImage && !imageError && (
        <div className="card-image-container">
          <img 
            src={ogImage} 
            alt="" 
            className="card-image"
            onError={() => setImageError(true)}
          />
        </div>
      )}
      
      <div className="card-content">
        <div className="card-header">
          {favicon && (
            <img 
              src={favicon} 
              alt="" 
              className="card-favicon"
              onError={(e) => e.target.style.display = 'none'}
            />
          )}
          {domain && <span className="card-domain">{domain}</span>}
          {enrichmentStatus === 'processing' && (
            <span className="enrichment-badge processing">⏳</span>
          )}
          {enrichmentStatus === 'failed' && (
            <button className="enrichment-badge failed" title="Auto-summary failed. Click to retry.">
              ⚠️
            </button>
          )}
        </div>
        
        <h3 className="card-title">{title}</h3>
        
        {summary && (
          <p className={`card-summary ${isTruncated ? 'truncated' : ''}`}>
            {summary}
          </p>
        )}
        
        <div className="card-meta">
          {readingTime && (
            <span className="card-reading-time">
              🕐 {formatReadingTime(readingTime)}
            </span>
          )}
          {difficultyConfig && (
            <span 
              className="card-difficulty"
              style={{ color: difficultyConfig.color }}
            >
              {difficultyConfig.icon} {difficultyConfig.label}
            </span>
          )}
        </div>
        
        {tags.length > 0 && (
          <div className="card-tags">
            {tags.map((tag, idx) => (
              <button 
                key={idx} 
                className="tag-chip"
                onClick={() => onTagClick?.(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
        
        <div className="card-footer">
          {savedDate && (
            <span className="card-date">Saved {formatDate(savedDate)}</span>
          )}
          <div className="card-actions">
            {onAddToCollection && (
              <button 
                className="card-action-btn" 
                onClick={onAddToCollection}
                title="Add to collection"
              >
                📁 Add to collection
              </button>
            )}
            {onDelete && (
              <button 
                className="card-action-btn delete" 
                onClick={onDelete}
                title="Delete"
              >
                🗑️
              </button>
            )}
          </div>
        </div>
      </div>
      
      <style>{`
        /* Grid Variant (Default) */
        .content-card-grid {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.2s;
        }
        
        .content-card-grid:hover {
          box-shadow: 0 8px 25px rgba(0,0,0,0.1);
          transform: translateY(-2px);
        }
        
        .card-image-container {
          height: 160px;
          overflow: hidden;
          background: #f1f5f9;
        }
        
        .card-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .card-content {
          padding: 16px;
        }
        
        .card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        
        .card-favicon {
          width: 16px;
          height: 16px;
          border-radius: 4px;
        }
        
        .card-domain {
          font-size: 12px;
          color: #64748b;
          flex: 1;
        }
        
        .enrichment-badge {
          font-size: 12px;
        }
        
        .enrichment-badge.processing {
          animation: pulse 1.5s infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .card-title {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 8px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .card-summary {
          font-size: 14px;
          color: #64748b;
          margin-bottom: 12px;
          line-height: 1.5;
        }
        
        .card-summary.truncated {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .card-meta {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
          font-size: 13px;
        }
        
        .card-reading-time, .card-difficulty {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .card-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 12px;
        }
        
        .tag-chip {
          background: #f1f5f9;
          color: #475569;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .tag-chip:hover {
          background: #e2e8f0;
          color: #1e293b;
        }
        
        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 12px;
          border-top: 1px solid #f1f5f9;
        }
        
        .card-date {
          font-size: 12px;
          color: #94a3b8;
        }
        
        .card-actions {
          display: flex;
          gap: 8px;
        }
        
        .card-action-btn {
          background: none;
          border: none;
          font-size: 13px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
          transition: all 0.2s;
        }
        
        .card-action-btn:hover {
          background: #f1f5f9;
        }
        
        .card-action-btn.delete:hover {
          background: #fef2f2;
          color: #ef4444;
        }
        
        /* List Variant */
        .content-card-list {
          display: flex;
          gap: 16px;
          padding: 16px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
        }
        
        .list-content {
          flex: 1;
          min-width: 0;
        }
        
        .list-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }
        
        .list-title {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
        }
        
        .list-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          font-size: 13px;
          color: #64748b;
          margin-bottom: 8px;
        }
        
        .list-summary {
          font-size: 14px;
          color: #475569;
          margin-bottom: 8px;
        }
        
        .list-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        
        .list-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: flex-end;
        }
        
        .list-image {
          width: 120px;
          height: 80px;
          object-fit: cover;
          border-radius: 8px;
        }
        
        .action-buttons {
          display: flex;
          gap: 4px;
        }
        
        .action-btn {
          background: none;
          border: none;
          font-size: 16px;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s;
        }
        
        .action-btn:hover {
          background: #f1f5f9;
        }
        
        .action-btn.delete:hover {
          background: #fef2f2;
        }
        
        /* Compact Variant */
        .content-card-compact {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
        }
        
        .compact-content {
          flex: 1;
          min-width: 0;
        }
        
        .compact-title {
          font-size: 14px;
          font-weight: 500;
          color: #1e293b;
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .compact-meta {
          font-size: 12px;
          color: #64748b;
        }
        
        .compact-actions {
          display: flex;
          gap: 4px;
        }
        
        .compact-action-btn {
          background: none;
          border: none;
          font-size: 14px;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s;
        }
        
        .compact-action-btn:hover {
          background: #f1f5f9;
        }
        
        /* Preview Variant (Sidebar) */
        .content-card-preview {
          padding: 12px;
          border-bottom: 1px solid #f1f5f9;
        }
        
        .preview-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 6px;
        }
        
        .preview-favicon {
          width: 14px;
          height: 14px;
          border-radius: 3px;
        }
        
        .preview-domain {
          font-size: 11px;
          color: #64748b;
        }
        
        .preview-title {
          font-size: 13px;
          font-weight: 500;
          color: #1e293b;
          margin-bottom: 4px;
          line-height: 1.4;
        }
        
        .preview-summary {
          font-size: 12px;
          color: #64748b;
          line-height: 1.4;
        }
        
        /* Dark Mode */
        .dark-mode .content-card-grid,
        .dark-mode .content-card-list,
        .dark-mode .content-card-compact {
          background: #1f2937;
          border-color: #374151;
        }
        
        .dark-mode .card-title,
        .dark-mode .list-title,
        .dark-mode .compact-title,
        .dark-mode .preview-title {
          color: #f1f5f9;
        }
        
        .dark-mode .card-summary,
        .dark-mode .list-summary,
        .dark-mode .preview-summary {
          color: #9ca3af;
        }
        
        .dark-mode .card-domain,
        .dark-mode .list-domain,
        .dark-mode .compact-domain,
        .dark-mode .preview-domain,
        .dark-mode .list-meta,
        .dark-mode .compact-meta {
          color: #9ca3af;
        }
        
        .dark-mode .tag-chip {
          background: #374151;
          color: #d1d5db;
        }
        
        .dark-mode .tag-chip:hover {
          background: #4b5563;
          color: #f1f5f9;
        }
        
        .dark-mode .card-footer {
          border-color: #374151;
        }
        
        .dark-mode .card-date {
          color: #6b7280;
        }
        
        .dark-mode .action-btn:hover,
        .dark-mode .card-action-btn:hover,
        .dark-mode .compact-action-btn:hover {
          background: #374151;
        }
      `}</style>
    </div>
  );
}
