import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import WorkspaceAvatar from './WorkspaceAvatar';

describe('WorkspaceAvatar', () => {
  it('renders the organization logo when src is provided', () => {
    render(
      <WorkspaceAvatar
        kind="organization"
        src="https://example.com/logo.png"
        name="Apex Construction"
      />,
    );

    expect(
      screen.getByRole('img', { name: 'Apex Construction logo' }),
    ).toHaveAttribute('src', 'https://example.com/logo.png');
  });

  it('falls back to Building icon when organization src is missing', () => {
    const { container } = render(
      <WorkspaceAvatar kind="organization" name="Valley Landscaping" />,
    );

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('falls back to generic icon when the image fails to load', () => {
    render(
      <WorkspaceAvatar
        kind="team"
        src="https://example.com/broken.png"
        name="Heavy Equipment Team"
      />,
    );

    const img = screen.getByRole('img', { name: /heavy equipment team/i });
    fireEvent.error(img);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
