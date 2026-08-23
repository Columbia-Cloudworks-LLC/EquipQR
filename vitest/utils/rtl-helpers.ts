import { fireEvent, screen, waitFor, type ByRoleOptions } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';

type RoleNameMatcher = NonNullable<ByRoleOptions['name']>;

/**
 * Wait until a button is present (common async UI test pattern).
 */
export async function waitForButton(name: RoleNameMatcher): Promise<void> {
  await waitFor(() => {
    expect(screen.getByRole('button', { name })).toBeInTheDocument();
  });
}

/**
 * Wait until a button is present, then click it with fireEvent.
 */
export async function clickButtonWhenReady(name: RoleNameMatcher): Promise<void> {
  await waitForButton(name);
  fireEvent.click(screen.getByRole('button', { name }));
}

/**
 * Wait until a button is present, then click it with userEvent (fake timers friendly).
 */
export async function clickButtonWhenReadyWithUser(
  user: UserEvent,
  name: RoleNameMatcher,
): Promise<void> {
  await waitForButton(name);
  await user.click(screen.getByRole('button', { name }));
}
