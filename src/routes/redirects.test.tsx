import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { RedirectToEquipment, RedirectToWorkOrder } from './redirects';

const LocationProbe = () => {
  const { pathname, search } = useLocation();
  return <div data-testid="location">{`${pathname}${search}`}</div>;
};

function renderAt(initialPath: string) {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/assets/:equipmentId" element={<RedirectToEquipment />} />
        <Route path="/inspections/:workOrderId" element={<RedirectToWorkOrder />} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
  return screen.getByTestId('location').textContent;
}

describe('legacy redirects', () => {
  it('preserves the query string when redirecting to equipment', () => {
    expect(renderAt('/assets/eq-1?tab=work-orders')).toBe('/dashboard/equipment/eq-1?tab=work-orders');
  });

  it('preserves the query string when redirecting to a work order', () => {
    expect(renderAt('/inspections/wo-1?section=pm')).toBe('/dashboard/work-orders/wo-1?section=pm');
  });

  it('redirects without a query string', () => {
    expect(renderAt('/assets/eq-2')).toBe('/dashboard/equipment/eq-2');
  });
});
