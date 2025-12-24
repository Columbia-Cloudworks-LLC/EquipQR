import React from 'react';
import { render, screen } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NotFound from '../NotFound';

// Spy on console.error
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('NotFound Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders 404 heading', () => {
    render(<NotFound />);

    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('renders page not found message', () => {
    render(<NotFound />);

    expect(screen.getByText('Oops! Page not found')).toBeInTheDocument();
  });

  it('renders return to home link', () => {
    render(<NotFound />);

    const homeLink = screen.getByRole('link', { name: /return to home/i });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('logs 404 error to console', () => {
    render(<NotFound />);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '404 Error: User attempted to access non-existent route:',
      '/'
    );
  });
});

