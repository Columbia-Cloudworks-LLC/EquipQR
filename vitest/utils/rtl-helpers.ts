import { fireEvent, screen, waitFor, type Matcher } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';

/**
 * Wait until a button is present (common async UI test pattern).
 */
export async function waitForButton(name: Matcher): Promise<void> {
  await waitFor(() => {
    expect(screen.getByRole('button', { name })).toBeInTheDocument();
  });
}

/**
 * Wait until a button is present, then click it with fireEvent.
 */
export async function clickButtonWhenReady(name: Matcher): Promise<void> {
  await waitForButton(name);
  fireEvent.click(screen.getByRole('button', { name }));
}

/**
 * Wait until a button is present, then click it with userEvent (fake timers friendly).
 */
export async function clickButtonWhenReadyWithUser(
  user: UserEvent,
  name: Matcher,
): Promise<void> {
  await waitForButton(name);
  await user.click(screen.getByRole('button', { name }));
}
