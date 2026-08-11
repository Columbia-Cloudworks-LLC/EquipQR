import { describe, expect, it } from 'vitest';
import { render, screen } from '@vitest-harness/utils/test-utils';
import { DsrQueueRail } from './DsrQueueRail';

describe('DsrQueueRail', () => {
  it('links the empty queue state to the Do Not Sell page', () => {
    render(<DsrQueueRail requests={[]} />);

    expect(screen.getByRole('link', { name: /no active requests/i })).toHaveAttribute(
      'href',
      '/do-not-sell-or-share',
    );
  });
});
