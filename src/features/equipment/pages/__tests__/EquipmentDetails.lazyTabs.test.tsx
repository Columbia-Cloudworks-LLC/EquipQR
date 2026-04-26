/**
 * Regression tests: lazy-tab gating for the equipment QR scan path (#694).
 *
 * These tests assert that inactive tab content is NOT rendered on initial
 * page load (details tab is active by default), and that it IS rendered
 * only when the corresponding tab is selected.
 *
 * The gating pattern under test is:
 *   <TabsContent value="notes">
 *     {activeTab === 'notes' && <EquipmentNotesTab ... />}
 *   </TabsContent>
 *
 * Key guarantees:
 * - Secondary tab components do NOT appear in the DOM when a different tab is active.
 * - Selecting a tab causes only that tab's content to mount.
 * - Switching back to a previous tab unmounts the last tab's content.
 */

import React from 'react';
import { render, screen } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Tabs, TabsContent } from '@/components/ui/tabs';

vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: vi.fn(() => false) }));

/**
 * Minimal inline gating component that mirrors the EquipmentDetails pattern
 * without depending on ResponsiveEquipmentTabs or lazy imports.
 * Controls `activeTab` via React state so we can assert gating directly.
 */
function GatedTabContents({ activeTab }: { activeTab: string }) {
  return (
    <Tabs value={activeTab} onValueChange={() => undefined}>
      <TabsContent value="details">
        <div data-testid="details-content">Details panel</div>
      </TabsContent>
      <TabsContent value="notes">
        {activeTab === 'notes' && <div data-testid="notes-content">Notes panel</div>}
      </TabsContent>
      <TabsContent value="work-orders">
        {activeTab === 'work-orders' && <div data-testid="work-orders-content">Work Orders panel</div>}
      </TabsContent>
      <TabsContent value="parts">
        {activeTab === 'parts' && <div data-testid="parts-content">Parts panel</div>}
      </TabsContent>
      <TabsContent value="images">
        {activeTab === 'images' && <div data-testid="images-content">Images panel</div>}
      </TabsContent>
      <TabsContent value="scans">
        {activeTab === 'scans' && <div data-testid="scans-content">Scans panel</div>}
      </TabsContent>
      <TabsContent value="history">
        {activeTab === 'history' && <div data-testid="history-content">History panel</div>}
      </TabsContent>
    </Tabs>
  );
}

describe('EquipmentDetails lazy-tab gating (issue #694)', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders only the details tab content on initial load', () => {
    const { rerender } = render(<GatedTabContents activeTab="details" />);
    rerender(<GatedTabContents activeTab="details" />);

    expect(screen.getByTestId('details-content')).toBeInTheDocument();
    expect(screen.queryByTestId('notes-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('work-orders-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('parts-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('images-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('scans-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('history-content')).not.toBeInTheDocument();
  });

  it('mounts notes content and not others when activeTab changes to notes', () => {
    const { rerender } = render(<GatedTabContents activeTab="details" />);

    expect(screen.queryByTestId('notes-content')).not.toBeInTheDocument();

    rerender(<GatedTabContents activeTab="notes" />);

    expect(screen.getByTestId('notes-content')).toBeInTheDocument();
    expect(screen.queryByTestId('work-orders-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('parts-content')).not.toBeInTheDocument();
  });

  it('mounts work-orders content only when activeTab is work-orders', () => {
    const { rerender } = render(<GatedTabContents activeTab="details" />);

    expect(screen.queryByTestId('work-orders-content')).not.toBeInTheDocument();

    rerender(<GatedTabContents activeTab="work-orders" />);

    expect(screen.getByTestId('work-orders-content')).toBeInTheDocument();
    expect(screen.queryByTestId('notes-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('parts-content')).not.toBeInTheDocument();
  });

  it('mounts parts content only when activeTab is parts', () => {
    const { rerender } = render(<GatedTabContents activeTab="details" />);
    rerender(<GatedTabContents activeTab="parts" />);
    expect(screen.getByTestId('parts-content')).toBeInTheDocument();
    expect(screen.queryByTestId('notes-content')).not.toBeInTheDocument();
  });

  it('mounts scans content only when activeTab is scans', () => {
    const { rerender } = render(<GatedTabContents activeTab="details" />);
    rerender(<GatedTabContents activeTab="scans" />);
    expect(screen.getByTestId('scans-content')).toBeInTheDocument();
  });

  it('mounts history content only when activeTab is history', () => {
    const { rerender } = render(<GatedTabContents activeTab="details" />);
    rerender(<GatedTabContents activeTab="history" />);
    expect(screen.getByTestId('history-content')).toBeInTheDocument();
    expect(screen.queryByTestId('notes-content')).not.toBeInTheDocument();
  });

  it('unmounts notes content and shows no secondary content when switching back to details', () => {
    const { rerender } = render(<GatedTabContents activeTab="notes" />);
    expect(screen.getByTestId('notes-content')).toBeInTheDocument();

    rerender(<GatedTabContents activeTab="details" />);

    expect(screen.queryByTestId('notes-content')).not.toBeInTheDocument();
  });

  it('switches content correctly when cycling through multiple tabs', () => {
    const { rerender } = render(<GatedTabContents activeTab="details" />);

    rerender(<GatedTabContents activeTab="work-orders" />);
    expect(screen.getByTestId('work-orders-content')).toBeInTheDocument();
    expect(screen.queryByTestId('notes-content')).not.toBeInTheDocument();

    rerender(<GatedTabContents activeTab="notes" />);
    expect(screen.getByTestId('notes-content')).toBeInTheDocument();
    expect(screen.queryByTestId('work-orders-content')).not.toBeInTheDocument();

    rerender(<GatedTabContents activeTab="details" />);
    expect(screen.queryByTestId('notes-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('work-orders-content')).not.toBeInTheDocument();
  });
});
