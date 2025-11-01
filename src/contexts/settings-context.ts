import { createContext } from 'react';

import type { UserSettings } from '@/types/settings';

export interface SettingsContextType {
  settings: UserSettings;
  updateSetting: <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => void;
  resetSettings: () => void;
  isLoading: boolean;
}

export const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

