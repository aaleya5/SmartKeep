import { useState, useEffect } from 'react';

/**
 * OfflineBanner - Shows a non-intrusive banner when the network is offline
 */
export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);
  const [isHiding, setIsHiding] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsHiding(true);
      setTimeout(() => {
        setIsOnline(true);
        setShowBanner(false);
        setIsHiding(false);
      }, 300);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial state
    if (!navigator.onLine) {
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showBanner) return null;

  return (
    <div 
      className={`offline-banner ${isHiding ? 'hiding' : ''}`}
      role="alert"
    >
      <span className="offline-icon">📡</span>
      <span className="offline-message">You're offline. Changes will sync when you reconnect.</span>
      
      <style>{`
        .offline-banner {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          padding: 0.75rem 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          font-weight: 500;
          z-index: 9999;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          animation: slideDown 0.3s ease-out;
        }

        .offline-banner.hiding {
          animation: slideUp 0.3s ease-out forwards;
        }

        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(0);
            opacity: 1;
          }
          to {
            transform: translateY(-100%);
            opacity: 0;
          }
        }

        .offline-icon {
          font-size: 1.1rem;
        }

        .offline-message {
          text-align: center;
        }

        /* Dark mode support */
        .dark-mode .offline-banner {
          background: linear-gradient(135deg, #b45309 0%, #92400e 100%);
        }
      `}</style>
    </div>
  );
}
