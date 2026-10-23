import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import RecommendedHardwareSection from './RecommendedHardwareSection';

describe('RecommendedHardwareSection (#1630)', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('renders the section heading, low-barrier paper testing callout, and three hardware tiers', () => {
    render(<RecommendedHardwareSection />);

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /Ready for the Field: Recommended Hardware/i,
      }),
    ).toBeInTheDocument();

    const callout = screen.getByTestId('hardware-paper-testing-callout');
    expect(callout).toHaveTextContent(/Start testing immediately on plain paper/i);
    expect(callout).toHaveTextContent(/zero hardware required/i);

    const list = screen.getByRole('list', {
      name: /Recommended label printers and media/i,
    });
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);

    const fieldTier = screen.getByTestId('hardware-tier-field-service-truck');
    expect(fieldTier).toHaveTextContent('Brady M210 Handheld Industrial Label Maker');
    expect(fieldTier).toHaveTextContent('Brady B-595 All-Weather Outdoor Vinyl');
    expect(fieldTier).toHaveTextContent('8–10 years outdoor UV, rain, diesel');

    const mobileTier = screen.getByTestId('hardware-tier-mobile-bluetooth');
    expect(mobileTier).toHaveTextContent('Brother P-Touch EDGE PT-E310BTVP');
    expect(mobileTier).toHaveTextContent(
      'Brother TZe Strong Adhesive Laminated Tape (18mm or 24mm)',
    );

    const deskTier = screen.getByTestId('hardware-tier-front-office-desk');
    expect(deskTier).toHaveTextContent(
      'Industrial Desktop Thermal Transfer Printer (e.g., LabelTac 4 or Zebra benchtop equivalent)',
    );
    expect(deskTier).toHaveTextContent('Outdoor Vinyl Supply Rolls + Resin Ribbon');
  });
});
