import React from 'react';
import { render, screen } from '@vitest-harness/utils/test-utils';
import { describe, it, expect } from 'vitest';
import EquipmentLoadingState from './EquipmentLoadingState';

describe('EquipmentLoadingState', () => {
  describe('Core Rendering', () => {
    it('renders PageHeader with title', () => {
      render(<EquipmentLoadingState />);

      expect(screen.getByText('Equipment')).toBeInTheDocument();
    });

    it('renders mobile skeleton rows', () => {
      render(<EquipmentLoadingState />);

      // Mobile skeleton list container is present
      const mobileList = document.querySelector('.md\\:hidden.flex.flex-col');
      expect(mobileList).toBeInTheDocument();
    });

    it('renders desktop skeleton grid', () => {
      render(<EquipmentLoadingState />);

      // Desktop grid container is present (may be hidden at test viewport but rendered in DOM)
      const desktopGrid = document.querySelector('.md\\:grid');
      expect(desktopGrid).toBeInTheDocument();
      expect(desktopGrid).toHaveClass('gap-6');
      expect(desktopGrid).toHaveClass('md:grid-cols-2');
      expect(desktopGrid).toHaveClass('lg:grid-cols-3');
    });
  });

  describe('Layout Structure', () => {
    it('renders five skeleton rows in the mobile list', () => {
      render(<EquipmentLoadingState />);

      const mobileList = document.querySelector('.md\\:hidden.flex.flex-col');
      expect(mobileList?.children).toHaveLength(5);
    });

    it('renders six skeleton cards in the desktop grid', () => {
      render(<EquipmentLoadingState />);

      const desktopGrid = document.querySelector('.md\\:grid');
      expect(desktopGrid?.children).toHaveLength(6);
    });
  });
});


