import { useCallback, useState, useEffect, useRef } from 'react';
import { useWhenPreferenceStorageAllowed } from '@/contexts/CookieConsentContext';
import { UserSettings, defaultUserSettings } from '@/types/settings';
import { getPreferenceLocalStorage, setPreferenceLocalStorage } from '@/lib/cookieConsent';

const SETTINGS_STORAGE_KEY = 'equipqr-user-settings';

export const useUserSettings = () => {
  const [settings, setSettings] = useState<UserSettings>(defaultUserSettings);
  const [isLoading, setIsLoading] = useState(true);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const loadSavedSettings = useCallback((): UserSettings | null => {
    try {
      const savedSettings = getPreferenceLocalStorage(SETTINGS_STORAGE_KEY);
      if (savedSettings) {
        const parsed = { ...defaultUserSettings, ...JSON.parse(savedSettings) };
        setSettings(parsed);
        return parsed;
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
    }
    return null;
  }, []);

  // Load settings from localStorage on mount
  useEffect(() => {
    loadSavedSettings();
    setIsLoading(false);
  }, [loadSavedSettings]);

  useWhenPreferenceStorageAllowed(() => {
    const loaded = loadSavedSettings();
    // No legacy value: persist in-memory settings (e.g. edits made before Accept).
    // When legacy exists, the settings-change effect persists after rehydrate.
    if (!loaded) {
      try {
        setPreferenceLocalStorage(SETTINGS_STORAGE_KEY, JSON.stringify(settingsRef.current));
      } catch (error) {
        console.error('Error saving user settings:', error);
      }
    }
  });

  // Persist when settings change. Do not key off Accept — that raced defaults
  // over legacy storage before rehydrate could apply the stored value.
  useEffect(() => {
    if (!isLoading) {
      try {
        setPreferenceLocalStorage(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      } catch (error) {
        console.error('Error saving user settings:', error);
      }
    }
  }, [settings, isLoading]);

  const updateSetting = <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const resetSettings = () => {
    setSettings(defaultUserSettings);
  };

  return {
    settings,
    updateSetting,
    resetSettings,
    isLoading,
  };
};
