import { useEffect, useCallback } from 'react';

/**
 * Custom hook for keyboard shortcuts
 * 
 * @param {Object} shortcuts - Map of key combinations to handlers
 * @param {Object} options - Options for @param {boolean the hook
 *} options.enabled - Whether the hook is enabled
 * @param {string[]} options.ignoreInputKeys - Keys to ignore when typing in input fields
 */
export function useKeyboardShortcuts(shortcuts, options = {}) {
  const { enabled = true, ignoreInputKeys = ['s', 'f'] } = options;

  const handleKeyDown = useCallback((event) => {
    if (!enabled) return;

    // Don't trigger shortcuts when typing in input fields (except for specific keys)
    const isInputElement = ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName) ||
      event.target.isContentEditable;

    if (isInputElement) {
      // Allow specific keys even when in input
      const key = event.key.toLowerCase();
      if (!ignoreInputKeys.includes(key)) {
        return;
      }
    }

    // Build the key combination
    const keys = [];
    if (event.ctrlKey || event.metaKey) keys.push('ctrl');
    if (event.shiftKey) keys.push('shift');
    if (event.altKey) keys.push('alt');
    keys.push(event.key.toLowerCase());

    const keyCombo = keys.join('+');

    // Find and execute the matching shortcut
    const handler = shortcuts[keyCombo];
    if (handler) {
      event.preventDefault();
      handler(event);
    }
  }, [shortcuts, enabled, ignoreInputKeys]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export default useKeyboardShortcuts;
