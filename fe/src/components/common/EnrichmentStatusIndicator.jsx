/**
 * EnrichmentStatusIndicator - Shows AI enrichment status
 * 
 * Props:
 * - status: 'pending' | 'processing' | 'complete' | 'failed' - Enrichment status
 * - onRetry: () => void - Retry handler (for failed status)
 */

export default function EnrichmentStatusIndicator({ status = 'pending', onRetry }) {
  const getConfig = () => {
    switch (status) {
      case 'pending':
        return {
          label: 'Pending',
          className: 'pending',
          icon: null // No icon, just content shown
        };
      case 'processing':
        return {
          label: 'Processing...',
          className: 'processing',
          icon: '⏳',
          animated: true
        };
      case 'complete':
        return {
          label: 'Enriched',
          className: 'complete',
          icon: '✓'
        };
      case 'failed':
        return {
          label: 'Failed',
          className: 'failed',
          icon: '⚠️',
          showTooltip: true,
          tooltipText: 'Auto-summary failed. Click to retry.'
        };
      default:
        return {
          label: 'Pending',
          className: 'pending',
          icon: null
        };
    }
  };
  
  const config = getConfig();
  
  if (status === 'pending') {
    // Pending: show nothing, content is just displayed
    return null;
  }
  
  if (status === 'complete') {
    // Complete: just show the enriched content, no indicator needed
    return null;
  }
  
  const handleClick = () => {
    if (status === 'failed' && onRetry) {
      onRetry();
    }
  };
  
  return (
    <span 
      className={`enrichment-status-indicator ${config.className} ${config.animated ? 'animated' : ''}`}
      onClick={handleClick}
      title={config.showTooltip ? config.tooltipText : undefined}
      role={status === 'failed' ? 'button' : undefined}
    >
      {config.icon && <span className="status-icon">{config.icon}</span>}
      <span className="status-label">{config.label}</span>
      
      <style>{`
        .enrichment-status-indicator {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          white-space: nowrap;
        }
        
        .enrichment-status-indicator.pending {
          background: #f1f5f9;
          color: #64748b;
        }
        
        .enrichment-status-indicator.processing {
          background: #fef3c7;
          color: #d97706;
        }
        
        .enrichment-status-indicator.processing.animated {
          animation: shimmer 1.5s infinite;
        }
        
        @keyframes shimmer {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        
        .enrichment-status-indicator.complete {
          background: #dcfce7;
          color: #16a34a;
        }
        
        .enrichment-status-indicator.failed {
          background: #fee2e2;
          color: #dc2626;
          cursor: pointer;
        }
        
        .enrichment-status-indicator.failed:hover {
          background: #fecaca;
        }
        
        .status-icon {
          font-size: 11px;
        }
        
        /* Dark mode */
        .dark-mode .enrichment-status-indicator.pending {
          background: #374151;
          color: #9ca3af;
        }
        
        .dark-mode .enrichment-status-indicator.processing {
          background: #451a03;
          color: #fbbf24;
        }
        
        .dark-mode .enrichment-status-indicator.complete {
          background: #14532d;
          color: #4ade80;
        }
        
        .dark-mode .enrichment-status-indicator.failed {
          background: #450a0a;
          color: #f87171;
        }
        
        .dark-mode .enrichment-status-indicator.failed:hover {
          background: #7f1d1d;
        }
      `}</style>
    </span>
  );
}
