import { useCallback, useRef, useState } from 'react';
import { useAutoSave } from './useAutoSave';
import { useBrowserStorage } from './useBrowserStorage';

interface UseSmartAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  storageKey: string;
  enabled?: boolean;
}

export const useSmartAutoSave = <T>({
  data,
  onSave,
  storageKey,
  enabled = true
}: UseSmartAutoSaveOptions<T>) => {
  const [hasChanges, setHasChanges] = useState(false);
  const lastSavedDataRef = useRef<T>();
  const lastStorageDataRef = useRef<string>('');

  // Browser storage for backup
  useBrowserStorage({
    key: storageKey,
    data,
    enabled
  });

  // Smart change detection
  const hasDataChanged = useCallback((currentData: T) => {
    const currentStr = JSON.stringify(currentData);
    const lastStr = JSON.stringify(lastSavedDataRef.current);
    return currentStr !== lastStr;
  }, []);

  // Optimized save function
  const handleSave = useCallback(async () => {
    if (!hasDataChanged(data)) return;

    await onSave(data);
    lastSavedDataRef.current = structuredClone(data);
    setHasChanges(false);
  }, [data, onSave, hasDataChanged]);

  // Auto-save with smart detection
  const { triggerAutoSave, cancelAutoSave, status, lastSaved } = useAutoSave({
    onSave: handleSave,
    enabled: enabled && hasChanges
  });

  // Trigger auto-save for different interaction types
  const triggerTextSave = useCallback((currentData: T) => {
    const dataStr = JSON.stringify(currentData);
    if (dataStr !== lastStorageDataRef.current) {
      setHasChanges(true);
      lastStorageDataRef.current = dataStr;
      triggerAutoSave('text', dataStr);
    }
  }, [triggerAutoSave]);

  const triggerSelectionSave = useCallback((currentData: T) => {
    const dataStr = JSON.stringify(currentData);
    if (dataStr !== lastStorageDataRef.current) {
      setHasChanges(true);
      lastStorageDataRef.current = dataStr;
      triggerAutoSave('selection', dataStr);
    }
  }, [triggerAutoSave]);

  const triggerManualSave = useCallback(async () => {
    cancelAutoSave();
    await handleSave();
  }, [cancelAutoSave, handleSave]);

  return {
    triggerTextSave,
    triggerSelectionSave,
    triggerManualSave,
    status,
    lastSaved,
    hasChanges,
    cancelAutoSave
  };
};