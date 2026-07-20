import { useCallback, useState, useEffect } from 'react';
import {
  usePreferenceStorageAllowed,
  useWhenPreferenceStorageAllowed,
} from '@/contexts/CookieConsentContext';
import { UserSettings, defaultUserSettings } from '@/types/settings';
import { getPreferenceLocalStorage, setPreferenceLocalStorage } from '@/lib/cookieConsent';

const SETTINGS_STORAGE_KEY = 'equipqr-user-settings';

export const useUserSettings = () => {
  const canUsePreferences = usePreferenceStorageAllowed();
  const [settings, setSettings] = useState<UserSettings>(defaultUserSettings);
  const [isLoading, setIsLoading] = useState(true);

  const loadSavedSettings = useCallback(() => {
    try {
      const savedSettings = getPreferenceLocalStorage(SETTINGS_STORAGE_KEY);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultUserSettings, ...parsed });
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
    }
  }, []);

  // Load settings from localStorage on mount
  useEffect(() => {
    loadSavedSettings();
    setIsLoading(false);
  }, [loadSavedSettings]);

  useWhenPreferenceStorageAllowed(loadSavedSettings);

  // Save settings to localStorage whenever they change (and after Accept).
  useEffect(() => {
    if (!isLoading && canUsePreferences) {
      try {
        setPreferenceLocalStorage(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      } catch (error) {
        console.error('Error saving user settings:', error);
      }
    }
  }, [settings, isLoading, canUsePreferences]);

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
