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
      
      const grid = document.querySelector('[class*="grid"]');
      expect(grid).toBeInTheDocument();
    });

    it('applies responsive grid classes', () => {
      render(<EquipmentLoadingState />);
      
      const grid = document.querySelector('[class*="grid"]');
      expect(grid).toHaveClass('grid');
      expect(grid).toHaveClass('gap-6');
      expect(grid).toHaveClass('md:grid-cols-2');
      expect(grid).toHaveClass('lg:grid-cols-3');
    });
  });

  describe('Layout Structure', () => {
    it('renders cards with proper structure', () => {
      render(<EquipmentLoadingState />);
      
      const cards = document.querySelectorAll('[class*="card"]');
      expect(cards.length).toBeGreaterThanOrEqual(3);
    });

    it('renders skeleton elements inside cards', () => {
      render(<EquipmentLoadingState />);
      
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThanOrEqual(3);
    });
  });
});


