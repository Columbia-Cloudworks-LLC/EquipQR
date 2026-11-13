import React from 'react';
import { render, screen } from '@vitest-harness/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Settings from './Settings';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', email: 'test@test.com' }
  }))
}));

vi.mock('@/contexts/useUser', () => ({
  useUser: vi.fn(() => ({
    currentUser: { id: 'user-1', name: 'Test User', email: 'test@test.com', avatar_url: null },
    setCurrentUser: vi.fn()
  }))
}));

vi.mock('@/contexts/SettingsContext', () => ({
  SettingsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

vi.mock('@/contexts/useSettings', () => ({
  useSettings: vi.fn(() => ({
    resetSettings: vi.fn()
  }))
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { email_private: false }, error: null })
        })
      })
    })
  }
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock('@/components/settings/SettingsNav', () => ({
  SettingsNav: () => <nav data-testid="settings-nav">Settings Nav</nav>
}));

vi.mock('@/components/settings/PersonalizationSettings', () => ({
  default: () => <div data-testid="personalization-settings">Personalization Settings</div>
}));

vi.mock('@/components/settings/ProfileSettings', () => ({
  default: () => <div data-testid="profile-settings">Profile Settings</div>
}));

vi.mock('@/components/settings/EmailPrivacySettings', () => ({
  EmailPrivacySettings: () => <div data-testid="email-privacy-settings">Email Privacy Settings</div>
}));

vi.mock('@/components/settings/SensitivePrivacySettings', () => ({
  SensitivePrivacySettings: () => <div data-testid="sensitive-privacy-settings">Sensitive Privacy Settings</div>
}));

vi.mock('@/components/settings/TelemetryConsentSettings', () => ({
  TelemetryConsentSettings: () => <div data-testid="telemetry-consent-settings" />,
}));

vi.mock('@/components/security/SecurityStatus', () => ({
  SecurityStatus: () => <div data-testid="security-status">Security Status</div>
}));

vi.mock('@/components/session/SessionStatus', () => ({
  SessionStatus: () => <div data-testid="session-status">Session Status</div>
}));

vi.mock('@/components/settings/NotificationSettings', () => ({
  default: () => <div data-testid="notification-settings">Notification Settings</div>
}));

vi.mock('@/components/settings/DeleteAccountDialog', () => ({
  default: () => null,
}));

describe('Settings Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Core Rendering', () => {
    it('renders page title and description', () => {
      render(<Settings />);

      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText(/Manage your account preferences and application settings/)).toBeInTheDocument();
    });

    it('renders user identity strip', () => {
      render(<Settings />);

      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('test@test.com')).toBeInTheDocument();
    });

    it('composes the navigation and every settings section', () => {
      render(<Settings />);

      for (const testId of [
        'settings-nav',
        'profile-settings',
        'personalization-settings',
        'notification-settings',
        'email-privacy-settings',
        'security-status',
        'session-status',
        'sensitive-privacy-settings',
        'telemetry-consent-settings',
      ]) {
        expect(screen.getByTestId(testId)).toBeInTheDocument();
      }
    });

    it('renders privacy rights links', () => {
      render(<Settings />);
      expect(screen.getByText('Submit Privacy Request')).toBeInTheDocument();
      expect(screen.getByText('View Privacy Policy')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /dsr cockpit/i })).toHaveAttribute(
        'href',
        '/dashboard/dsr',
      );
    });

    it('renders section headings in sidebar layout', () => {
      render(<Settings />);
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Personalization')).toBeInTheDocument();
      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('Privacy')).toBeInTheDocument();
      expect(screen.getByText('Security')).toBeInTheDocument();
    });
  });

  describe('Danger Zone', () => {
    it('renders danger zone with reset button', () => {
      render(<Settings />);

      expect(screen.getByText('Danger Zone')).toBeInTheDocument();
      expect(screen.getByText('Reset All Settings')).toBeInTheDocument();
      expect(screen.getByText(/Reset all settings to their default values/)).toBeInTheDocument();
    });

    it('renders reset button', () => {
      render(<Settings />);

      expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    });
  });
});
