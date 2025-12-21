import React from 'react';
import { render, screen } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Settings from '../Settings';

// Mock hooks
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', email: 'test@test.com' }
  }))
}));

// Mock contexts
vi.mock('@/contexts/SettingsContext', () => ({
  SettingsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

vi.mock('@/contexts/useSettings', () => ({
  useSettings: vi.fn(() => ({
    resetSettings: vi.fn()
  }))
}));

// Mock supabase
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

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

// Mock sub-components
vi.mock('@/components/settings/PersonalizationSettings', () => ({
  default: () => <div data-testid="personalization-settings">Personalization Settings</div>
}));

vi.mock('@/components/settings/ProfileSettings', () => ({
  default: () => <div data-testid="profile-settings">Profile Settings</div>
}));

vi.mock('@/components/settings/EmailPrivacySettings', () => ({
  EmailPrivacySettings: () => <div data-testid="email-privacy-settings">Email Privacy Settings</div>
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

    it('renders profile settings section', () => {
      render(<Settings />);

      expect(screen.getByTestId('profile-settings')).toBeInTheDocument();
    });

    it('renders personalization settings section', () => {
      render(<Settings />);

      expect(screen.getByTestId('personalization-settings')).toBeInTheDocument();
    });

    it('renders notification settings section', () => {
      render(<Settings />);

      expect(screen.getByTestId('notification-settings')).toBeInTheDocument();
    });

    it('renders email privacy settings section', () => {
      render(<Settings />);

      expect(screen.getByTestId('email-privacy-settings')).toBeInTheDocument();
    });

    it('renders security status section', () => {
      render(<Settings />);

      expect(screen.getByTestId('security-status')).toBeInTheDocument();
    });

    it('renders session status section', () => {
      render(<Settings />);

      expect(screen.getByTestId('session-status')).toBeInTheDocument();
    });
  });

  describe('Reset Settings', () => {
    it('renders reset settings card', () => {
      render(<Settings />);

      expect(screen.getByText('Reset Settings')).toBeInTheDocument();
      expect(screen.getByText(/Reset all settings to their default values/)).toBeInTheDocument();
    });

    it('renders reset all settings button', () => {
      render(<Settings />);

      expect(screen.getByRole('button', { name: /reset all settings/i })).toBeInTheDocument();
    });
  });
});

