import { fireEvent, screen, waitFor, type Matcher } from '@testing-library/react';

/**
 * Wait until a button is present, then click it (common async UI test pattern).
 */
export async function clickButtonWhenReady(name: Matcher): Promise<void> {
  await waitFor(() => {
    expect(screen.getByRole('button', { name })).toBeInTheDocument();
  });
  fireEvent.click(screen.getByRole('button', { name }));
}
