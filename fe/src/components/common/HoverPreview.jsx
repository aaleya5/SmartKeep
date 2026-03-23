import { useState, useEffect, useRef } from 'react';

/**
 * HoverPreview - Shows a popover with full summary text when hovering a card
 * 
 * Props:
 * - content: string - The full content to display
 * - children: ReactNode - The trigger element
 * - delay: number - Delay in ms before showing (default: 500)
 */
export default function HoverPreview({ content, children, delay = 500 }) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [hasError, setHasError] = useState(false);
  const timeoutRef = useRef(null);
  const triggerRef = useRef(null);

  const handleMouseEnter = (e) => {
    const trigger = e.currentTarget;
    const rect = trigger.getBoundingClientRect();
    
    timeoutRef.current = setTimeout(() => {
      setPosition({
        x: rect.left + rect.width / 2,
        y: rect.top
      });
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!content) return <>{children}</>;

  return (
    <div 
      className="hover-preview-wrapper"
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      
      {isVisible && (
        <div 
          className="hover-preview-popover"
          style={{
            left: position.x,
            top: position.y,
          }}
        >
          <div className="preview-arrow" />
          <div className="preview-content">
            {content}
          </div>
          
          <style>{`
            .hover-preview-popover {
              position: fixed;
              transform: translate(-50%, -100%);
              z-index: 1000;
              background: #1f2937;
              color: white;
              padding: 0;
              border-radius: 12px;
              box-shadow: 0 8px 24px rgba(0,0,0,0.25);
              max-width: 350px;
              max-height: 300px;
              overflow: hidden;
              animation: previewFadeIn 0.2s ease-out;
            }

            @keyframes previewFadeIn {
              from {
                opacity: 0;
                transform: translate(-50%, -95%);
              }
              to {
                opacity: 1;
                transform: translate(-50%, -100%);
              }
            }

            .preview-arrow {
              position: absolute;
              bottom: -8px;
              left: 50%;
              transform: translateX(-50%);
              width: 0;
              height: 0;
              border-left: 8px solid transparent;
              border-right: 8px solid transparent;
              border-top: 8px solid #1f2937;
            }

            .preview-content {
              padding: 1rem;
              font-size: 0.9rem;
              line-height: 1.6;
              overflow-y: auto;
              max-height: 280px;
            }

            /* Light mode border for better visibility */
            .hover-preview-popover::before {
              content: '';
              position: absolute;
              inset: 0;
              border-radius: 12px;
              padding: 1px;
              background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
              -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
              mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
              -webkit-mask-composite: xor;
              mask-composite: exclude;
              pointer-events: none;
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
