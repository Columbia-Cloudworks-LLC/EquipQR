import React from 'react';
import { render, screen, fireEvent } from '@vitest-harness/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NotificationSettings from './NotificationSettings';
import {
  normalizeNotificationPreferences,
  serializeNotificationPreferences,
  getDefaultNotificationPreferences,
  type UserOrgNotificationPreferencesDocument,
} from '@/hooks/useNotificationSettings';

const mockMutateAsync = vi.fn().mockResolvedValue({});
const mockUseUserTeamsForNotifications = vi.fn();
const mockUseOrgNotificationPreferences = vi.fn();

vi.mock('@/hooks/useNotificationSettings', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/useNotificationSettings')>(
    '@/hooks/useNotificationSettings',
  );
  return {
    ...actual,
    useUserTeamsForNotifications: () => mockUseUserTeamsForNotifications(),
    useOrgNotificationPreferences: () => mockUseOrgNotificationPreferences(),
    useUpsertOrgNotificationPreferences: () => ({
      mutateAsync: mockMutateAsync,
      isPending: false,
    }),
  };
});

describe('NotificationPreferences helpers (#1438)', () => {
  it('applies documented defaults when preference row or keys are missing', () => {
    const normalized = normalizeNotificationPreferences(undefined, 'America/Chicago');
    expect(normalized).toEqual({
      channels: { in_app: true, email: true, web_push: true },
      quiet_hours: {
        enabled: false,
        start: '22:00',
        end: '07:00',
        timezone: 'America/Chicago',
      },
      digest: { mode: 'realtime' },
      high_priority_only: false,
      teams: {},
    });
  });

  it('replaces migrated UTC placeholder with browser timezone when quiet hours are disabled', () => {
    const normalized = normalizeNotificationPreferences(
      {
        channels: { in_app: true, email: false, web_push: true },
        quiet_hours: { enabled: false, start: '22:00', end: '07:00', timezone: 'UTC' },
        digest: { mode: 'daily' },
        high_priority_only: true,
        teams: {
          'team-1': { enabled: true, statuses: ['assigned', 'completed'] },
        },
      },
      'America/New_York',
    );

    expect(normalized.channels.email).toBe(false);
    expect(normalized.quiet_hours.timezone).toBe('America/New_York');
    expect(normalized.digest.mode).toBe('daily');
    expect(normalized.high_priority_only).toBe(true);
    expect(normalized.teams['team-1']).toEqual({
      enabled: true,
      statuses: ['assigned', 'completed'],
    });
  });

  it('round-trips through serializeNotificationPreferences', () => {
    const doc = getDefaultNotificationPreferences('America/Chicago');
    doc.high_priority_only = true;
    doc.digest.mode = 'daily';
    doc.teams['team-abc'] = { enabled: true, statuses: ['in_progress'] };

    const serialized = serializeNotificationPreferences(doc);
    const parsed = normalizeNotificationPreferences(serialized, 'America/Chicago');
    expect(parsed).toEqual(doc);
  });
});

describe('NotificationSettings Component (#1438)', () => {
  const sampleTeams = [
    {
      organization_id: 'org-1',
      organization_name: 'Acme Fleet',
      team_id: 'team-1',
      team_name: 'Field Repair',
      user_role: 'technician',
      has_access: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUserTeamsForNotifications.mockReturnValue({
      data: sampleTeams,
      isLoading: false,
    });
  });

  it('renders empty state when user belongs to no teams', () => {
    mockUseUserTeamsForNotifications.mockReturnValue({
      data: [],
      isLoading: false,
    });
    mockUseOrgNotificationPreferences.mockReturnValue({
      data: {},
      isLoading: false,
    });

    render(<NotificationSettings />);
    expect(screen.getByText(/You're not a member of any teams yet/i)).toBeInTheDocument();
  });

  it('renders channel switches, high-priority toggle, quiet hours, and team matrix', () => {
    const prefs: UserOrgNotificationPreferencesDocument = {
      channels: { in_app: true, email: true, web_push: false },
      quiet_hours: {
        enabled: true,
        start: '21:00',
        end: '06:00',
        timezone: 'America/Chicago',
      },
      digest: { mode: 'realtime' },
      high_priority_only: false,
      teams: {
        'team-1': { enabled: true, statuses: ['assigned', 'in_progress'] },
      },
    };

    mockUseOrgNotificationPreferences.mockReturnValue({
      data: { 'org-1': prefs },
      isLoading: false,
    });

    render(<NotificationSettings />);

    expect(screen.getByText('Acme Fleet')).toBeInTheDocument();
    expect(screen.getByText('Field Repair')).toBeInTheDocument();
    expect(screen.getByText('1 team enabled')).toBeInTheDocument();

    // Channel toggles
    const emailSwitch = screen.getByRole('switch', {
      name: /Enable email notifications for Acme Fleet/i,
    });
    expect(emailSwitch).toHaveAttribute('data-state', 'checked');

    const pushSwitch = screen.getByRole('switch', {
      name: /Enable web push notifications for Acme Fleet/i,
    });
    expect(pushSwitch).toHaveAttribute('data-state', 'unchecked');

    // Quiet hours inputs visible when enabled
    expect(
      screen.getByLabelText(/Quiet hours start time for Acme Fleet/i),
    ).toHaveValue('21:00');
    expect(
      screen.getByLabelText(/Quiet hours end time for Acme Fleet/i),
    ).toHaveValue('06:00');

    // Toggling high-priority only triggers upsert with updated preference document
    const highPrioritySwitch = screen.getByRole('switch', {
      name: /High-priority notifications only for Acme Fleet/i,
    });
    fireEvent.click(highPrioritySwitch);

    expect(mockMutateAsync).toHaveBeenCalledWith({
      organizationId: 'org-1',
      preferences: expect.objectContaining({
        high_priority_only: true,
      }),
    });
  });
});
