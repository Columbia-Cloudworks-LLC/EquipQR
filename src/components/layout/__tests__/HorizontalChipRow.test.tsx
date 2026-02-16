import React from 'react';
import { render, screen } from '@/test/utils/test-utils';
import { describe, it, expect } from 'vitest';
import { HorizontalChipRow } from '../HorizontalChipRow';
import { Button } from '@/components/ui/button';

describe('HorizontalChipRow', () => {
  describe('Core Rendering', () => {
    it('renders children correctly', () => {
      render(
        <HorizontalChipRow>
          <Button>Filter 1</Button>
          <Button>Filter 2</Button>
          <Button>Filter 3</Button>
        </HorizontalChipRow>
      );

      expect(screen.getByText('Filter 1')).toBeInTheDocument();
      expect(screen.getByText('Filter 2')).toBeInTheDocument();
      expect(screen.getByText('Filter 3')).toBeInTheDocument();
    });

    it('renders with default aria-label', () => {
      render(
        <HorizontalChipRow>
          <Button>Test</Button>
        </HorizontalChipRow>
      );

      expect(screen.getByRole('region', { name: 'Filter options' })).toBeInTheDocument();
    });

    it('renders with custom aria-label', () => {
      render(
        <HorizontalChipRow ariaLabel="Quick filter chips">
          <Button>Test</Button>
        </HorizontalChipRow>
      );

      expect(screen.getByRole('region', { name: 'Quick filter chips' })).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(
        <HorizontalChipRow className="my-custom-class" ariaLabel="Test region">
          <Button>Test</Button>
        </HorizontalChipRow>
      );

      const region = screen.getByRole('region', { name: 'Test region' });
      expect(region).toHaveClass('my-custom-class');
    });
  });

  describe('Gap Configuration', () => {
    it('uses default gap-2 when no gap prop is provided', () => {
      const { container } = render(
        <HorizontalChipRow>
          <Button>Test</Button>
        </HorizontalChipRow>
      );

      // The scrollable container should have the gap class
      const scrollContainer = container.querySelector('.flex.flex-nowrap');
      expect(scrollContainer).toHaveClass('gap-2');
    });

    it('uses custom gap when provided', () => {
      const { container } = render(
        <HorizontalChipRow gap="gap-3">
          <Button>Test</Button>
        </HorizontalChipRow>
      );

      const scrollContainer = container.querySelector('.flex.flex-nowrap');
      expect(scrollContainer).toHaveClass('gap-3');
    });
  });

  describe('Scroll Hint Indicators', () => {
    it('renders scroll hint gradient elements', () => {
      const { container } = render(
        <HorizontalChipRow>
          <Button>Test</Button>
        </HorizontalChipRow>
      );

      // There should be two gradient elements (left and right)
      const gradients = container.querySelectorAll('[aria-hidden="true"]');
      expect(gradients.length).toBe(2);
    });

    it('hides scroll hints when content does not overflow', () => {
      const { container } = render(
        <HorizontalChipRow>
          <Button>Short</Button>
        </HorizontalChipRow>
      );

      // Both hints should be hidden (opacity-0) when content doesn't overflow
      const gradients = container.querySelectorAll('[aria-hidden="true"]');
      gradients.forEach((gradient) => {
        expect(gradient).toHaveClass('opacity-0');
      });
    });
  });

  describe('Accessibility', () => {
    it('is accessible with proper region role', () => {
      render(
        <HorizontalChipRow ariaLabel="Filter buttons">
          <Button>Button 1</Button>
          <Button>Button 2</Button>
        </HorizontalChipRow>
      );

      const region = screen.getByRole('region', { name: 'Filter buttons' });
      expect(region).toBeInTheDocument();
    });

    it('hides decorative gradient elements from accessibility tree', () => {
      const { container } = render(
        <HorizontalChipRow>
          <Button>Test</Button>
        </HorizontalChipRow>
      );

      const gradients = container.querySelectorAll('[aria-hidden="true"]');
      expect(gradients.length).toBeGreaterThan(0);
      gradients.forEach((gradient) => {
        expect(gradient).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles empty children', () => {
      const { container } = render(
        <HorizontalChipRow>{null}</HorizontalChipRow>
      );

      expect(container.firstChild).toBeInTheDocument();
    });

    it('handles single child', () => {
      render(
        <HorizontalChipRow>
          <Button>Only Button</Button>
        </HorizontalChipRow>
      );

      expect(screen.getByText('Only Button')).toBeInTheDocument();
    });

    it('handles many children', () => {
      const buttons = Array.from({ length: 20 }, (_, i) => (
        <Button key={i}>Button {i + 1}</Button>
      ));

      render(<HorizontalChipRow>{buttons}</HorizontalChipRow>);

      expect(screen.getByText('Button 1')).toBeInTheDocument();
      expect(screen.getByText('Button 20')).toBeInTheDocument();
    });
  });
});
