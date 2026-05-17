import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { RouteAnnouncer } from '../RouteAnnouncer';

function PageA() {
  return (
    <main id="main-content" tabIndex={-1}>
      <h1 data-route-heading="true" tabIndex={-1}>
        Page A
      </h1>
      <Link to="/b">Go B</Link>
    </main>
  );
}

function PageB() {
  return (
    <main id="main-content" tabIndex={-1}>
      <h1 data-route-heading="true" tabIndex={-1}>
        Page B
      </h1>
    </main>
  );
}

describe('RouteAnnouncer', () => {
  afterEach(() => {
    cleanup();
  });

  it('focuses the route heading after client-side navigation', async () => {
    document.title = 'Page A | EquipQR';

    render(
      <MemoryRouter initialEntries={['/a']}>
        <RouteAnnouncer />
        <Routes>
          <Route path="/a" element={<PageA />} />
          <Route path="/b" element={<PageB />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('link', { name: /go b/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /page b/i })).toHaveFocus();
    });

    const live = screen.getByRole('status');
    await waitFor(() => {
      expect(live.textContent?.length).toBeGreaterThan(0);
    });
  });
});
