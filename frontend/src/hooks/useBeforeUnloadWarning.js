import { useEffect } from 'react';

/**
 * Shows the browser's native "Leave site? Changes you made may not be saved."
 * prompt when the user tries to reload or close the tab while `hasUnsavedChanges`
 * is true. Automatically cleans up the listener when the flag clears or the
 * component unmounts.
 */
export function useBeforeUnloadWarning(hasUnsavedChanges) {
  useEffect(() => {
    if (!hasUnsavedChanges) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      // Required for Chrome to trigger the confirmation dialog.
      event.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);
}
