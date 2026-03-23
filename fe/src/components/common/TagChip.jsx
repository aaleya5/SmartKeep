/**
 * TagChip - Reusable tag display component
 * 
 * Props:
 * - label: string - Tag text
 * - variant: 'default' | 'suggested' | 'selected' | 'removable' - Tag variant
 * - color: string - Custom color (hex)
 * - onClick: () => void - Click handler
 * - onRemove: () => void - Remove handler (for removable variant)
 * - onAccept: () => void - Accept handler (for suggested variant)
 */

export default function TagChip({
  label,
  variant = 'default',
  color,
  onClick,
  onRemove,
  onAccept
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'suggested':
        return {
          background: color ? `${color}20` : '#f1f5f9',
          color: color || '#64748b',
          border: `1px dashed ${color || '#94a3b8'}`,
          opacity: 0.7
        };
      case 'selected':
        return {
          background: color || '#667eea',
          color: 'white',
          border: 'none'
        };
      case 'removable':
        return {
          background: '#f1f5f9',
          color: '#475569',
          border: 'none'
        };
      default: // 'default'
        return {
          background: color ? `${color}20` : '#f1f5f9',
          color: color || '#475569',
          border: 'none'
        };
    }
  };
  
  const styles = getVariantStyles();
  
  const handleClick = () => {
    if (variant === 'suggested' && onAccept) {
      onAccept();
    } else if (onClick) {
      onClick();
    }
  };
  
  return (
    <span
      className={`tag-chip tag-chip-${variant}`}
      style={styles}
      onClick={handleClick}
      role={variant !== 'default' ? 'button' : undefined}
    >
      {variant === 'suggested' && (
        <span className="tag-add-icon">+</span>
      )}
      <span className="tag-label">{label}</span>
      {variant === 'removable' && onRemove && (
        <button 
          className="tag-remove-btn"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          type="button"
        >
          ×
        </button>
      )}
      
      <style>{`
        .tag-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 500;
          cursor: default;
          transition: all 0.2s;
          white-space: nowrap;
        }
        
        .tag-chip-default,
        .tag-chip-selected,
        .tag-chip-removable {
          cursor: pointer;
        }
        
        .tag-chip-default:hover {
          filter: brightness(0.95);
        }
        
        .tag-chip-suggested {
          cursor: pointer;
        }
        
        .tag-chip-suggested:hover {
          opacity: 1 !important;
          transform: scale(1.02);
        }
        
        .tag-add-icon {
          font-size: 14px;
          font-weight: 600;
        }
        
        .tag-remove-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          margin-left: 2px;
          margin-right: -4px;
          border: none;
          background: rgba(0, 0, 0, 0.1);
          border-radius: 50%;
          font-size: 12px;
          line-height: 1;
          cursor: pointer;
          opacity: 0.6;
          transition: opacity 0.2s;
        }
        
        .tag-remove-btn:hover {
          opacity: 1;
        }
        
        /* Dark mode */
        .dark-mode .tag-chip-default,
        .dark-mode .tag-chip-removable {
          background: #374151;
          color: #d1d5db;
        }
        
        .dark-mode .tag-chip-suggested {
          background: #1f2937;
        }
        
        .dark-mode .tag-remove-btn {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </span>
  );
}
