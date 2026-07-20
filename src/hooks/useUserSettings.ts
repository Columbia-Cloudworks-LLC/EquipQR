import { useState, useEffect } from 'react';
import { UserSettings, defaultUserSettings } from '@/types/settings';
import { setPreferenceLocalStorage } from '@/lib/cookieConsent';

const SETTINGS_STORAGE_KEY = 'equipqr-user-settings';

export const useUserSettings = () => {
  const [settings, setSettings] = useState<UserSettings>(defaultUserSettings);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultUserSettings, ...parsed });
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save settings to localStorage whenever they change
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
