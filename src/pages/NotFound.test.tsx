import React from 'react';
import { render, screen } from '@vitest-harness/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NotFound from './NotFound';

// Spy on console.error
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('NotFound Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page not found heading', () => {
    render(<NotFound />);

    expect(screen.getByRole('heading', { name: 'Page not found', level: 1 })).toBeInTheDocument();
  });

  it('renders the missing path copy', () => {
    render(<NotFound />);

    expect(screen.getByText(/we couldn't find the public equipqr page at/i)).toBeInTheDocument();
    expect(screen.getByText('/')).toBeInTheDocument();
  });

  it('renders return home and releases links', () => {
    render(<NotFound />);

    const homeLink = screen.getByRole('link', { name: /return home/i });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute('href', '/');

    const releasesLink = screen.getByRole('link', { name: /view releases/i });
    expect(releasesLink).toBeInTheDocument();
    expect(releasesLink).toHaveAttribute('href', '/releases');
  });

  it('logs 404 error to console', () => {
    render(<NotFound />);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '404 Error: User attempted to access non-existent route:',
      '/'
    );
  });
});

