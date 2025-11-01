
import React, { ReactNode } from 'react';
import { useUserSettings } from '@/hooks/useUserSettings';
import {
  SettingsContext,
  type SettingsContextType,
} from './settings-context';

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const { settings, updateSetting, resetSettings, isLoading } = useUserSettings();

  const value: SettingsContextType = {
    settings,
    updateSetting,
    resetSettings,
    isLoading,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
