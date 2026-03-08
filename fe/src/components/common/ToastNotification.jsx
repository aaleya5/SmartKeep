import { useEffect, useState, useCallback, createContext, useContext } from 'react';

// Toast context for global toast access
const ToastContext = createContext(null);

// Toast state management
let toastListeners = [];
let toastId = 0;

// Toast API - add to your app via ToastProvider
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  
  const addToast = useCallback((message, type, duration = 4000) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type, duration }]);
    
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
    
    return id;
  }, []);
  
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);
  
  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);
  
  const toast = useCallback((message, type = 'info', duration) => {
    return addToast(message, type, duration);
  }, [addToast]);
  
  toast.success = (message, duration) => addToast(message, 'success', duration);
  toast.error = (message, duration) => addToast(message, 'error', duration);
  toast.info = (message, duration) => addToast(message, 'info', duration);
  toast.warning = (message, duration) => addToast(message, 'warning', duration);
  toast.remove = removeToast;
  toast.clear = clearToasts;
  
  const value = {
    toast,
    success: toast.success,
    error: toast.error,
    info: toast.info,
    warning: toast.warning,
    remove: removeToast,
    clear: clearToasts
  };
  
  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

// Toast container component
function ToastContainer({ toasts, onRemove }) {
  if (toasts.length === 0) return null;
  
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast 
          key={toast.id} 
          message={toast.message} 
          type={toast.type} 
          onClose={() => onRemove(toast.id)}
        />
      ))}
      
      <style>{`
        .toast-container {
          position: fixed;
          bottom: 24px;
          right: 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          z-index: 10000;
          max-width: 400px;
        }
        
        @media (max-width: 480px) {
          .toast-container {
            left: 16px;
            right: 16px;
            bottom: 16px;
            max-width: none;
          }
        }
      `}</style>
    </div>
  );
}

// Individual Toast component
function Toast({ message, type, onClose }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  
  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, []);
  
  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(onClose, 200);
  };
  
  const getIcon = () => {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✕';
      case 'warning': return '⚠';
      case 'info': return 'ℹ';
      default: return '';
    }
  };
  
  return (
    <div 
      className={`toast toast-${type} ${isVisible ? 'visible' : ''} ${isLeaving ? 'leaving' : ''}`}
      onClick={handleClose}
    >
      <span className="toast-icon">{getIcon()}</span>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={handleClose}>×</button>
      
      <style>{`
        .toast {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: white;
          border-radius: 10px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
          cursor: pointer;
          transform: translateX(120%);
          opacity: 0;
          transition: all 0.2s ease;
        }
        
        .toast.visible {
          transform: translateX(0);
          opacity: 1;
        }
        
        .toast.leaving {
          transform: translateX(120%);
          opacity: 0;
        }
        
        .toast-success {
          border-left: 4px solid #22c55e;
        }
        
        .toast-error {
          border-left: 4px solid #dc2626;
        }
        
        .toast-warning {
          border-left: 4px solid #f59e0b;
        }
        
        .toast-info {
          border-left: 4px solid #3b82f6;
        }
        
        .toast-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          font-size: 12px;
          font-weight: bold;
          flex-shrink: 0;
        }
        
        .toast-success .toast-icon {
          background: #dcfce7;
          color: #22c55e;
        }
        
        .toast-error .toast-icon {
          background: #fee2e2;
          color: #dc2626;
        }
        
        .toast-warning .toast-icon {
          background: #fef3c7;
          color: #f59e0b;
        }
        
        .toast-info .toast-icon {
          background: #dbeafe;
          color: #3b82f6;
        }
        
        .toast-message {
          flex: 1;
          font-size: 14px;
          color: #1e293b;
          line-height: 1.4;
        }
        
        .toast-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border: none;
          background: transparent;
          font-size: 18px;
          color: #94a3b8;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        
        .toast-close:hover {
          background: #f1f5f9;
          color: #64748b;
        }
        
        /* Dark mode */
        .dark-mode .toast {
          background: #1f2937;
        }
        
        .dark-mode .toast-message {
          color: #f1f5f9;
        }
        
        .dark-mode .toast-close {
          color: #6b7280;
        }
        
        .dark-mode .toast-close:hover {
          background: #374151;
          color: #d1d5db;
        }
      `}</style>
    </div>
  );
}

export default ToastProvider;
