import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { RouteAnnouncer } from './RouteAnnouncer';

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

function PageList() {
  const { search } = useLocation();
  return (
    <main id="main-content" tabIndex={-1}>
      <h1 data-route-heading="true" tabIndex={-1}>
        Work orders
      </h1>
      <span data-testid="location-search">{search}</span>
      <input aria-label="Filter" defaultValue="" />
      <Link to="/list?sort=name">Sort by name</Link>
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

  it('does not announce or move focus when only the query string changes', async () => {
    document.title = 'List | EquipQR';

    render(
      <MemoryRouter initialEntries={['/list']}>
        <RouteAnnouncer />
        <Routes>
          <Route path="/list" element={<PageList />} />
        </Routes>
      </MemoryRouter>
    );

    const filter = screen.getByRole('textbox', { name: /filter/i });
    filter.focus();
    expect(filter).toHaveFocus();

    fireEvent.click(screen.getByRole('link', { name: /sort by name/i }));

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveTextContent('?sort=name');
    });

    expect(filter).toHaveFocus();
    const live = screen.getByRole('status');
    expect(live.textContent?.trim() ?? '').toBe('');
  });
});
