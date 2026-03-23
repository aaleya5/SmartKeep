/**
 * ReadingTimeBadge - Shows reading time with clock icon
 * 
 * Props:
 * - minutes: number - Reading time in minutes
 */

export default function ReadingTimeBadge({ minutes }) {
  const formatTime = () => {
    if (!minutes) return null;
    if (minutes < 1) return '< 1 min read';
    if (minutes === 1) return '1 min read';
    return `~${Math.round(minutes)} min read`;
  };
  
  const timeString = formatTime();
  
  if (!timeString) return null;
  
  return (
    <span className="reading-time-badge">
      <span className="clock-icon">🕐</span>
      <span className="time-text">{timeString}</span>
      
      <style>{`
        .reading-time-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          color: #64748b;
        }
        
        .clock-icon {
          font-size: 12px;
        }
      `}</style>
    </span>
  );
}
