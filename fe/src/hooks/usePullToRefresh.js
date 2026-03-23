import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * usePullToRefresh - Hook for pull-to-refresh functionality on mobile
 * 
 * @param {Object} options
 * @param {() => Promise<void>} options.onRefresh - Callback to refresh data
 * @param {number} options.threshold - Distance in pixels to trigger refresh (default: 80)
 * @param {boolean} options.enabled - Whether the hook is enabled
 */
export function usePullToRefresh({ onRefresh, threshold = 80, enabled = true }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  
  const startY = useRef(0);
  const currentY = useRef(0);
  const isPullingRef = useRef(false);

  const handleTouchStart = useCallback((e) => {
    // Only enable pull-to-refresh when at the top of the page
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      isPullingRef.current = true;
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isPullingRef.current || !enabled) return;
    
    currentY.current = e.touches[0].clientY;
    const distance = currentY.current - startY.current;
    
    // Only allow pulling down (positive distance)
    if (distance > 0) {
      setPullDistance(distance);
      
      // Prevent default only when pulling down at the top
      if (distance > 10 && window.scrollY === 0) {
        // Don't prevent default here as it can interfere with scrolling
      }
    }
  }, [enabled]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current || !enabled) return;
    
    isPullingRef.current = false;
    setIsPulling(false);
    
    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      
      try {
        await onRefresh?.();
      } catch (error) {
        console.error('Pull to refresh failed:', error);
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setPullDistance(0);
  }, [pullDistance, threshold, onRefresh, enabled]);

  useEffect(() => {
    if (!enabled) return;

    // Add touch event listeners
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Calculate the pull progress (0 to 1)
  const pullProgress = Math.min(pullDistance / threshold, 1);

  return {
    isRefreshing,
    isPulling,
    pullDistance,
    pullProgress,
  };
}

export default usePullToRefresh;
