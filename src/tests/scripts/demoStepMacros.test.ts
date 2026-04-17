import { describe, expect, it } from 'vitest';
import { expandDemoMacro, listDemoMacros } from '../../../scripts/lib/demoStepMacros.mjs';

describe('demo step macros', () => {
  it('lists known macro names', () => {
    const names = listDemoMacros();
    expect(names).toContain('openNav');
    expect(names).toContain('returnDashboard');
  });

  it('expands openNav into action steps', () => {
    const expanded = expandDemoMacro({
      type: 'macro',
      name: 'openNav',
      args: { label: 'Inventory' }
    });
    expect(expanded.length).toBeGreaterThan(0);
    expect(expanded[0].type).toBe('action');
  });

  it('throws for unknown macros', () => {
    expect(() =>
      expandDemoMacro({
        type: 'macro',
        name: 'unknownMacro'
      })
    ).toThrow(/Unknown demo macro/i);
  });
});
