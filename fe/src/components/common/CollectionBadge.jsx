/**
 * CollectionBadge - Small pill showing collection color dot + name
 * 
 * Props:
 * - name: string - Collection name
 * - color: string - Collection color (hex)
 * - onClick: () => void - Click handler to navigate to collection
 */

export default function CollectionBadge({ name, color = '#667eea', onClick }) {
  return (
    <button 
      className="collection-badge"
      onClick={onClick}
      type="button"
    >
      <span 
        className="collection-dot" 
        style={{ backgroundColor: color }}
      />
      <span className="collection-name">{name}</span>
      
      <style>{`
        .collection-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: #f1f5f9;
          border: none;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .collection-badge:hover {
          background: #e2e8f0;
        }
        
        .collection-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        
        .collection-name {
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        /* Dark mode */
        .dark-mode .collection-badge {
          background: #374151;
          color: #d1d5db;
        }
        
        .dark-mode .collection-badge:hover {
          background: #4b5563;
        }
      `}</style>
    </button>
  );
}
