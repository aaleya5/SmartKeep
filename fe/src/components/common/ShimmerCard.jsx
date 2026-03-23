import { useState, useEffect } from 'react';

/**
 * ShimmerCard - A shimmer skeleton loading state for cards
 * 
 * Props:
 * - variant: 'grid' | 'list' | 'compact' - Card variant
 * - onAnimationEnd: () => void - Callback when shimmer animation ends
 */
export default function ShimmerCard({ variant = 'grid', onAnimationEnd }) {
  const [isShimmering, setIsShimmering] = useState(true);

  useEffect(() => {
    // Shimmer animation runs indefinitely for optimistic UI
    const interval = setInterval(() => {
      setIsShimmering(prev => !prev);
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const handleAnimationEnd = () => {
    if (onAnimationEnd) {
      onAnimationEnd();
    }
  };

  if (variant === 'list') {
    return (
      <div className="shimmer-card-list" onAnimationEnd={handleAnimationEnd}>
        <div className="shimmer-line" style={{ width: '20px', height: '20px', borderRadius: '4px' }} />
        <div className="shimmer-content">
          <div className="shimmer-line title" />
          <div className="shimmer-line meta" style={{ width: '60%' }} />
        </div>
        <div className="shimmer-line" style={{ width: '80px' }} />
        <div className="shimmer-line" style={{ width: '50px' }} />
        
        <style>{shimmerStyles}</style>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="shimmer-card-compact" onAnimationEnd={handleAnimationEnd}>
        <div className="shimmer-line" style={{ width: '20px', height: '20px', borderRadius: '4px' }} />
        <div className="shimmer-line title" style={{ flex: 1 }} />
        <div className="shimmer-line" style={{ width: '80px' }} />
        
        <style>{shimmerStyles}</style>
      </div>
    );
  }

  // Grid variant (default)
  return (
    <div className="shimmer-card-grid" onAnimationEnd={handleAnimationEnd}>
      <div className="shimmer-thumbnail" />
      <div className="shimmer-content">
        <div className="shimmer-line meta" style={{ width: '40%' }} />
        <div className="shimmer-line title" />
        <div className="shimmer-line summary" />
        <div className="shimmer-line summary" style={{ width: '70%' }} />
        <div className="shimmer-badges">
          <div className="shimmer-badge" />
          <div className="shimmer-badge" />
        </div>
      </div>
      
      <style>{shimmerStyles}</style>
    </div>
  );
}

const shimmerStyles = `
  .shimmer-card-grid,
  .shimmer-card-list,
  .shimmer-card-compact {
    background: white;
    border-radius: 12px;
    overflow: hidden;
    animation: fadeIn 0.3s ease-out;
  }

  .shimmer-card-grid {
    display: flex;
    flex-direction: column;
  }

  .shimmer-thumbnail {
    height: 120px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }

  .shimmer-content {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .shimmer-line {
    height: 12px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 4px;
  }

  .shimmer-line.title {
    height: 16px;
    width: 80%;
  }

  .shimmer-line.summary {
    height: 14px;
  }

  .shimmer-line.meta {
    height: 10px;
    width: 60%;
  }

  .shimmer-badges {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.25rem;
  }

  .shimmer-badge {
    height: 20px;
    width: 60px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 4px;
  }

  .shimmer-card-list {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1rem;
  }

  .shimmer-card-list .shimmer-content {
    flex: 1;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .shimmer-card-compact {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;
  }

  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Shake animation for failed saves */
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
    20%, 40%, 60%, 80% { transform: translateX(5px); }
  }

  .shimmer-card-grid.shake,
  .shimmer-card-list.shake,
  .shimmer-card-compact.shake {
    animation: shake 0.5s ease-in-out;
  }

  /* Dark mode */
  .dark-mode .shimmer-card-grid,
  .dark-mode .shimmer-card-list,
  .dark-mode .shimmer-card-compact {
    background: #1f2937;
  }

  .dark-mode .shimmer-line,
  .dark-mode .shimmer-thumbnail,
  .dark-mode .shimmer-badge {
    background: linear-gradient(90deg, #374151 25%, #4b5563 50%, #374151 75%);
    background-size: 200% 100%;
  }
`;
