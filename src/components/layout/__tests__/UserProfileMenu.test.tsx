import React from 'react';
import { render, screen } from '@/test/utils/test-utils';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const signOutMock = vi.fn();
const openBugReportMock = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ signOut: signOutMock }),
}));

vi.mock('@/contexts/useUser', () => ({
  useUser: () => ({
    currentUser: {
      id: 'test-user',
      name: 'Test User',
      email: 'test@example.com',
    },
    isLoading: false,
    error: null,
    refreshUser: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('@/features/tickets/context/BugReportContext', () => ({
  useBugReport: () => ({ openBugReport: openBugReportMock }),
}));

import UserProfileMenu from '../UserProfileMenu';

describe('UserProfileMenu', () => {
  beforeEach(() => {
    signOutMock.mockReset();
    openBugReportMock.mockReset();
  });

  it('renders an accessible avatar trigger labeled with the current user', () => {
    render(<UserProfileMenu />);
    expect(
      screen.getByRole('button', { name: /user menu \(test user\)/i }),
    ).toBeInTheDocument();
  });

  it('opens the dropdown and shows the name, email, and account actions', async () => {
    const user = userEvent.setup();
    render(<UserProfileMenu />);

    await user.click(
      screen.getByRole('button', { name: /user menu \(test user\)/i }),
    );

    expect(await screen.findByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /support/i })).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: /report an issue/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /sign out/i })).toBeInTheDocument();
  });

  it('invokes the bug report dialog when "Report an Issue" is selected', async () => {
    const user = userEvent.setup();
    render(<UserProfileMenu />);

    await user.click(
      screen.getByRole('button', { name: /user menu \(test user\)/i }),
    );
    await user.click(
      await screen.findByRole('menuitem', { name: /report an issue/i }),
    );

    expect(openBugReportMock).toHaveBeenCalledTimes(1);
  });

  it('invokes signOut when "Sign out" is selected', async () => {
    const user = userEvent.setup();
    render(<UserProfileMenu />);

    await user.click(
      screen.getByRole('button', { name: /user menu \(test user\)/i }),
    );
    await user.click(
      await screen.findByRole('menuitem', { name: /sign out/i }),
    );

    expect(signOutMock).toHaveBeenCalledTimes(1);
  });
});
