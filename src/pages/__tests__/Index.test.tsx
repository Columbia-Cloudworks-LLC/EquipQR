import React from 'react';
import { render, screen } from '@/test/utils/test-utils';
import { describe, it, expect } from 'vitest';
import Index from '../Index';

describe('Index Page', () => {
  it('renders welcome heading', () => {
    render(<Index />);

    expect(screen.getByText(/Welcome to Your Blank App/i)).toBeInTheDocument();
  });

  it('renders description text', () => {
    render(<Index />);

    expect(screen.getByText(/Start building your amazing project/i)).toBeInTheDocument();
  });
});

