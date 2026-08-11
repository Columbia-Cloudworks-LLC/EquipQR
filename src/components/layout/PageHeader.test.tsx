import React from 'react';
import { render, screen } from '@vitest-harness/utils/test-utils';
import { describe, it, expect } from 'vitest';
import PageHeader from './PageHeader';

describe('PageHeader', () => {
  describe('density prop', () => {
    it('renders default density with space-y-4', () => {
      const { container } = render(<PageHeader title="Test Page" />);

      const root = container.querySelector('.space-y-4');
      expect(root).toBeInTheDocument();
      expect(root?.className).not.toContain('lg:space-y-2');
    });

    it('renders compact density with tighter desktop spacing', () => {
      const { container } = render(
        <PageHeader
          title="Detail Page"
          density="compact"
          breadcrumbs={[
            { label: 'List', href: '/list' },
            { label: 'Current' },
          ]}
        />,
      );

      const root = container.querySelector('.space-y-4');
      expect(root).toBeInTheDocument();
      expect(root?.className).toContain('lg:space-y-2');

      expect(screen.getByText('List')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Detail Page' })).toBeInTheDocument();
    });

    it('applies className alongside density classes', () => {
      const { container } = render(
        <PageHeader title="Custom" className="mt-8" density="compact" />,
      );

      const root = container.querySelector('.space-y-4');
      expect(root).toBeInTheDocument();
      expect(root?.className).toContain('mt-8');
      expect(root?.className).toContain('lg:space-y-2');
    });
  });

  it('exposes route heading focus target for RouteAnnouncer', () => {
    render(<PageHeader title="Equipment" />);
    const heading = screen.getByRole('heading', { level: 1, name: 'Equipment' });
    expect(heading).toHaveAttribute('data-route-heading', 'true');
    expect(heading).toHaveAttribute('tabindex', '-1');
  });
});
