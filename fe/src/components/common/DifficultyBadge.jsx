/**
 * DifficultyBadge - Shows content difficulty level
 * 
 * Props:
 * - level: 'easy' | 'intermediate' | 'advanced' - Difficulty level
 */

export default function DifficultyBadge({ level }) {
  const getConfig = () => {
    switch (level) {
      case 'easy':
        return {
          label: 'Easy',
          color: '#22c55e',
          bgColor: '#dcfce7',
          icon: '📖'
        };
      case 'intermediate':
        return {
          label: 'Intermediate',
          color: '#f59e0b',
          bgColor: '#fef3c7',
          icon: '📖📖'
        };
      case 'advanced':
        return {
          label: 'Advanced',
          color: '#ef4444',
          bgColor: '#fee2e2',
          icon: '📖📖📖'
        };
      default:
        return null;
    }
  };
  
  const config = getConfig();
  
  if (!config) return null;
  
  return (
    <span 
      className="difficulty-badge"
      style={{ 
        backgroundColor: config.bgColor,
        color: config.color 
      }}
    >
      <span className="badge-icon">{config.icon}</span>
      <span className="badge-label">{config.label}</span>
      
      <style>{`
        .difficulty-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }
        
        .badge-icon {
          font-size: 11px;
        }
        
        /* Dark mode */
        .dark-mode .difficulty-badge {
          background-color: var(--badge-bg);
          color: var(--badge-color);
        }
        
        .dark-mode .difficulty-badge[style*="--badge-bg"] {
          /* Use inline styles in dark mode with adjusted colors */
        }
      `}</style>
    </span>
  );
}
