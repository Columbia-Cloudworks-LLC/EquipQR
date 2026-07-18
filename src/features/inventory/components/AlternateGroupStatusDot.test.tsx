import React from 'react';
import { render, screen } from '@vitest-harness/utils/test-utils';
import { describe, it, expect } from 'vitest';
import { AlternateGroupStatusDot } from './AlternateGroupStatusDot';

describe('AlternateGroupStatusDot', () => {
  it('renders a verified status dot with an accessible label', () => {
    render(<AlternateGroupStatusDot status="verified" />);

    expect(screen.getByRole('img', { name: 'Verified' })).toBeInTheDocument();
  });

  it('renders an unverified status dot with an accessible label', () => {
    render(<AlternateGroupStatusDot status="unverified" />);

    expect(screen.getByRole('img', { name: 'Unverified' })).toBeInTheDocument();
  });

  it('renders a deprecated status dot with an accessible label', () => {
    render(<AlternateGroupStatusDot status="deprecated" />);

    expect(screen.getByRole('img', { name: 'Deprecated' })).toBeInTheDocument();
  });
});
