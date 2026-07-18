import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { render, screen, fireEvent } from '@testing-library/react';
import { TestProviders } from '@/test/utils/TestProviders';

function QueryClientProbe({ onReady }: { onReady: (client: QueryClient) => void }) {
  const queryClient = useQueryClient();
  const [tick, setTick] = useState(0);
  onReady(queryClient);
  return (
    <button type="button" onClick={() => setTick((n) => n + 1)}>
      re-render {tick}
    </button>
  );
}

describe('TestProviders QueryClient stability (#1314)', () => {
  it('keeps the same QueryClient instance across child re-renders', () => {
    const seen: QueryClient[] = [];

    render(
      <TestProviders>
        <QueryClientProbe onReady={(client) => seen.push(client)} />
      </TestProviders>,
    );

    expect(seen.length).toBeGreaterThanOrEqual(1);
    const first = seen[0];

    fireEvent.click(screen.getByRole('button', { name: /re-render/i }));

    expect(seen.length).toBeGreaterThan(1);
    expect(seen.every((client) => client === first)).toBe(true);
  });
});
