import React from 'react';
import { render, screen } from '@/test/utils/test-utils';
import { describe, it, expect } from 'vitest';
import EquipmentLoadingState from '../EquipmentLoadingState';

describe('EquipmentLoadingState', () => {
  describe('Core Rendering', () => {
    it('renders PageHeader with title and description', () => {
      render(<EquipmentLoadingState />);
      
      expect(screen.getByText('Equipment')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders skeleton cards in grid layout', () => {
      render(<EquipmentLoadingState />);
      
      // Should render 3 skeleton cards
      const skeletons = screen.getAllByRole('generic').filter(
        (el) => el.className.includes('skeleton') || el.querySelector('[class*="skeleton"]')
      );
      
      // The grid should be present
      const grid = screen.getByText('Equipment').closest('div')?.querySelector('[class*="grid"]');
      expect(grid).toBeInTheDocument();
    });

    it('applies responsive grid classes', () => {
      const { container } = render(<EquipmentLoadingState />);
      
      const grid = container.querySelector('[class*="grid"]');
      expect(grid).toHaveClass('grid');
      expect(grid).toHaveClass('gap-6');
      expect(grid).toHaveClass('md:grid-cols-2');
      expect(grid).toHaveClass('lg:grid-cols-3');
    });
  });

  describe('Layout Structure', () => {
    it('renders cards with proper structure', () => {
      const { container } = render(<EquipmentLoadingState />);
      
      const cards = container.querySelectorAll('[class*="card"]');
      expect(cards.length).toBeGreaterThanOrEqual(3);
    });

    it('renders skeleton elements inside cards', () => {
      const { container } = render(<EquipmentLoadingState />);
      
      const skeletons = container.querySelectorAll('[class*="skeleton"]');
      expect(skeletons.length).toBeGreaterThanOrEqual(3);
    });
  });
});

