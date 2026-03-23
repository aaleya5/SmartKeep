import { useState, useEffect } from 'react';

/**
 * ConfirmModal - Reusable modal for destructive actions
 * 
 * Props:
 * - isOpen: boolean - Whether modal is visible
 * - onClose: () => void - Close handler
 * - onConfirm: () => void - Confirm handler
 * - title: string - Modal title
 * - message: string - Modal message
 * - confirmText: string - Confirm button text (default: 'Delete')
 * - cancelText: string - Cancel button text (default: 'Cancel')
 * - confirmType: 'danger' | 'warning' - Type of confirmation
 * - requireConfirmation: boolean - Whether to require secondary confirmation
 * - confirmationWord: string - Word user must type (for high-risk)
 * - isLoading: boolean - Loading state
 */

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  confirmType = 'danger',
  requireConfirmation = false,
  confirmationWord = '',
  isLoading = false
}) {
  const [confirmationInput, setConfirmationInput] = useState('');
  
  // Reset confirmation when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setConfirmationInput('');
    }
  }, [isOpen]);
  
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  const isConfirmed = requireConfirmation 
    ? confirmationInput.toLowerCase() === confirmationWord.toLowerCase()
    : true;
  
  const handleConfirm = () => {
    if (isConfirmed && !isLoading) {
      onConfirm();
    }
  };
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className={`modal-icon ${confirmType}`}>
            {confirmType === 'danger' ? '⚠️' : '⚡'}
          </span>
          <h2 className="modal-title">{title}</h2>
        </div>
        
        <p className="modal-message">{message}</p>
        
        {requireConfirmation && (
          <div className="confirmation-input-wrapper">
            <label htmlFor="confirm-input">
              Type <strong>{confirmationWord}</strong> to confirm:
            </label>
            <input
              id="confirm-input"
              type="text"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder={`Type "${confirmationWord}"`}
              autoFocus
              disabled={isLoading}
            />
          </div>
        )}
        
        <div className="modal-actions">
          <button 
            className="btn-cancel"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button 
            className={`btn-confirm ${confirmType}`}
            onClick={handleConfirm}
            disabled={!isConfirmed || isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner-small"></span>
                Processing...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
      
      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 24px;
          animation: fadeIn 0.2s ease;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .modal-content {
          background: white;
          border-radius: 16px;
          padding: 24px;
          max-width: 400px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
          animation: slideUp 0.2s ease;
        }
        
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .modal-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        
        .modal-icon {
          font-size: 24px;
        }
        
        .modal-title {
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
        }
        
        .modal-message {
          font-size: 15px;
          color: #64748b;
          line-height: 1.5;
          margin-bottom: 24px;
        }
        
        .confirmation-input-wrapper {
          margin-bottom: 24px;
        }
        
        .confirmation-input-wrapper label {
          display: block;
          font-size: 14px;
          color: #64748b;
          margin-bottom: 8px;
        }
        
        .confirmation-input-wrapper input {
          width: 100%;
          padding: 12px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 15px;
          transition: border-color 0.2s;
        }
        
        .confirmation-input-wrapper input:focus {
          outline: none;
          border-color: #667eea;
        }
        
        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }
        
        .btn-cancel {
          padding: 10px 20px;
          border: none;
          background: #f1f5f9;
          color: #475569;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-cancel:hover:not(:disabled) {
          background: #e2e8f0;
        }
        
        .btn-confirm {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .btn-confirm.danger {
          background: #dc2626;
          color: white;
        }
        
        .btn-confirm.danger:hover:not(:disabled) {
          background: #b91c1c;
        }
        
        .btn-confirm.warning {
          background: #f59e0b;
          color: white;
        }
        
        .btn-confirm.warning:hover:not(:disabled) {
          background: #d97706;
        }
        
        .btn-confirm:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .spinner-small {
          width: 14px;
          height: 14px;
          border: 2px solid transparent;
          border-top-color: currentColor;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        /* Dark mode */
        .dark-mode .modal-content {
          background: #1f2937;
        }
        
        .dark-mode .modal-title {
          color: #f1f5f9;
        }
        
        .dark-mode .modal-message {
          color: #9ca3af;
        }
        
        .dark-mode .confirmation-input-wrapper label {
          color: #9ca3af;
        }
        
        .dark-mode .confirmation-input-wrapper input {
          background: #374151;
          border-color: #4b5563;
          color: #f1f5f9;
        }
        
        .dark-mode .btn-cancel {
          background: #374151;
          color: #d1d5db;
        }
        
        .dark-mode .btn-cancel:hover:not(:disabled) {
          background: #4b5563;
        }
      `}</style>
    </div>
  );
}
