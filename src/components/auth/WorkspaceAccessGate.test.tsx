import React from 'react';
import { render, screen } from '@vitest-harness/utils/test-utils';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WorkspaceAccessGate from '@/components/auth/WorkspaceAccessGate';

const signOutMock = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ signOut: signOutMock }),
}));

describe('WorkspaceAccessGate', () => {
  beforeEach(() => {
    signOutMock.mockReset();
  });

  it('calls signOut when the user chooses Sign out', async () => {
    const user = userEvent.setup();

    render(<WorkspaceAccessGate mode="blocked" domain="claimed.test" />);

    await user.click(screen.getByRole('button', { name: /sign out/i }));

    expect(signOutMock).toHaveBeenCalledTimes(1);
  });
});
