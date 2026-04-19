import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@/test/utils/test-utils';
import { MapView } from '../MapView';

vi.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="api-provider">{children}</div>
  ),
  Map: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="google-map">{children}</div>
  ),
  AdvancedMarker: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="marker">{children}</div>
  ),
  InfoWindow: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="info-window">{children}</div>
  ),
  useMap: vi.fn(() => null),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

interface GoogleMapsMock {
  maps: {
    Size: (width: number, height: number) => { width: number; height: number };
    Point: (x: number, y: number) => { x: number; y: number };
    LatLngBounds: () => { extend: () => void; toJSON: () => unknown };
    event: { addListenerOnce: () => void };
  };
}

global.window.google = {
  maps: {
    Size: vi.fn((width: number, height: number) => ({ width, height })),
    Point: vi.fn((x: number, y: number) => ({ x, y })),
    LatLngBounds: vi.fn(() => ({ extend: vi.fn(), toJSON: vi.fn() })),
    event: { addListenerOnce: vi.fn() },
  },
} as unknown as GoogleMapsMock;

describe('MapView gm_authFailure handling', () => {
  let originalReload: typeof window.location.reload;

  beforeEach(() => {
    vi.clearAllMocks();
    delete window.gm_authFailure;
    // jsdom's location.reload is a no-op; preserve a reference to restore it
    // even though we never actually fire it in these assertions.
    originalReload = window.location.reload;
  });

  afterEach(() => {
    delete window.gm_authFailure;
    window.location.reload = originalReload;
  });

  it('installs window.gm_authFailure on mount and removes it on unmount', () => {
    expect(window.gm_authFailure).toBeUndefined();

    const { unmount } = render(
      <MapView
        googleMapsKey="test-api-key"
        mapId="test-map-id"
        equipmentLocations={[]}
        filteredLocations={[]}
      />,
    );

    expect(window.gm_authFailure).toBeInstanceOf(Function);

    unmount();

    expect(window.gm_authFailure).toBeUndefined();
  });

  it('renders the diagnostic card with both the wildcard allowlist entry and the current URL when gm_authFailure fires', () => {
    render(
      <MapView
        googleMapsKey="test-api-key"
        mapId="test-map-id"
        equipmentLocations={[]}
        filteredLocations={[]}
      />,
    );

    // Map renders normally before the auth failure.
    expect(screen.getByTestId('google-map')).toBeInTheDocument();
    expect(screen.queryByTestId('maps-auth-failure-card')).not.toBeInTheDocument();

    act(() => {
      window.gm_authFailure?.();
    });

    expect(screen.getByTestId('maps-auth-failure-card')).toBeInTheDocument();
    expect(screen.getByText('Map could not load')).toBeInTheDocument();

    // The card MUST surface the wildcard referrer pattern (what the operator
    // actually pastes into the Google Cloud allowlist), not just the route-
    // specific URL — otherwise operators add a too-narrow entry that doesn't
    // cover other routes. See PR #636 review feedback.
    const expectedAllowlistEntry = `${window.location.origin}/*`;
    const expectedCurrentUrl = `${window.location.origin}${window.location.pathname}`;
    expect(screen.getByTestId('maps-auth-failure-allowlist-entry')).toHaveTextContent(
      expectedAllowlistEntry,
    );
    expect(screen.getByTestId('maps-auth-failure-current-url')).toHaveTextContent(
      expectedCurrentUrl,
    );

    // The map must be unmounted so its half-initialized children cannot crash.
    expect(screen.queryByTestId('google-map')).not.toBeInTheDocument();

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view runbook/i })).toBeInTheDocument();
  });

  it('does not crash when gm_authFailure had no prior handler installed', () => {
    expect(window.gm_authFailure).toBeUndefined();

    const { unmount } = render(
      <MapView
        googleMapsKey="test-api-key"
        mapId="test-map-id"
        equipmentLocations={[]}
        filteredLocations={[]}
      />,
    );

    expect(() => {
      act(() => {
        window.gm_authFailure?.();
      });
    }).not.toThrow();

    unmount();
    expect(window.gm_authFailure).toBeUndefined();
  });

  it('Try Again button is wired to window.location.reload', () => {
    const reloadSpy = vi.fn();
    Object.defineProperty(window.location, 'reload', {
      configurable: true,
      value: reloadSpy,
    });

    render(
      <MapView
        googleMapsKey="test-api-key"
        mapId="test-map-id"
        equipmentLocations={[]}
        filteredLocations={[]}
      />,
    );

    act(() => {
      window.gm_authFailure?.();
    });

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('chains to a previously-installed gm_authFailure handler when our handler fires', () => {
    const previousHandler = vi.fn();
    window.gm_authFailure = previousHandler;

    render(
      <MapView
        googleMapsKey="test-api-key"
        mapId="test-map-id"
        equipmentLocations={[]}
        filteredLocations={[]}
      />,
    );

    // We installed a new handler, replacing the prior one.
    expect(window.gm_authFailure).not.toBe(previousHandler);

    act(() => {
      window.gm_authFailure?.();
    });

    // The prior handler must have been called as part of our handler chain.
    expect(previousHandler).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('maps-auth-failure-card')).toBeInTheDocument();
  });

  it('restores the previously-installed handler on unmount', () => {
    const previousHandler = vi.fn();
    window.gm_authFailure = previousHandler;

    const { unmount } = render(
      <MapView
        googleMapsKey="test-api-key"
        mapId="test-map-id"
        equipmentLocations={[]}
        filteredLocations={[]}
      />,
    );
    expect(window.gm_authFailure).not.toBe(previousHandler);

    unmount();
    expect(window.gm_authFailure).toBe(previousHandler);
  });

  it('does not overwrite a handler that was installed by something else after mount', () => {
    const { unmount } = render(
      <MapView
        googleMapsKey="test-api-key"
        mapId="test-map-id"
        equipmentLocations={[]}
        filteredLocations={[]}
      />,
    );

    // Simulate another feature installing its own handler while we are mounted.
    const otherHandler = vi.fn();
    window.gm_authFailure = otherHandler;

    unmount();

    // Our cleanup must not have clobbered the third-party handler — they own
    // it now, our identity check refused to touch it.
    expect(window.gm_authFailure).toBe(otherHandler);
  });
});
