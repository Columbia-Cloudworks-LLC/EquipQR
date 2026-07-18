import React from 'react';
import { vi } from 'vitest';
import { SettingsContext } from '@/contexts/settings-context';
import type { UserSettings } from '@/types/settings';

export const SYDNEY_USER_SETTINGS: UserSettings = {
  timezone: 'Australia/Sydney',
  dateFormat: 'MM/dd/yyyy',
};

export function createSettingsTestWrapper(settings: UserSettings = SYDNEY_USER_SETTINGS) {
  return function SettingsTestWrapper({ children }: { children: React.ReactNode }) {
    return (
      <SettingsContext.Provider
        value={{
          settings,
          updateSetting: vi.fn(),
          resetSettings: vi.fn(),
          isLoading: false,
        }}
      >
        {children}
      </SettingsContext.Provider>
    );
  };
}
