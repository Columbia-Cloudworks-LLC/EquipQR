import { describe, expect, it } from 'vitest';
import {
  parseScenarioRegistry,
  expandScenarioSteps,
  resolveScenarioSelection
} from '../../../scripts/lib/demoScenarioEngine.mjs';

const validRegistry = {
  version: 2,
  suites: { core: ['sample'] },
  scenarios: [
    {
      id: 'sample',
      title: 'Sample',
      description: 'Sample scenario',
      flowToken: 'sample-flow',
      targetDurationMs: { min: 1000, max: 9000 },
      scenes: [
        {
          id: 'scene-a',
          title: 'Scene A',
          route: '/dashboard',
          intent: 'Show dashboard',
          steps: [{ type: 'macro', name: 'returnDashboard' }],
          requiredCheckpoints: [{ id: 'cp', type: 'urlIncludes', value: '/dashboard' }]
        }
      ]
    }
  ]
};

describe('parseScenarioRegistry', () => {
  it('parses valid v2 registry and resolves suites', () => {
    const parsed = parseScenarioRegistry(validRegistry);
    const selected = resolveScenarioSelection(parsed, { suite: 'core' });
    expect(selected).toHaveLength(1);
    expect(selected[0].id).toBe('sample');
  });

  it('fails fast on unknown suite scenario references', () => {
    expect(() =>
      parseScenarioRegistry({
        ...validRegistry,
        suites: { bad: ['missing'] }
      })
    ).toThrow(/unknown scenario/i);
  });
});

describe('expandScenarioSteps', () => {
  it('expands macro steps into executable action steps', () => {
    const parsed = parseScenarioRegistry(validRegistry);
    const expanded = expandScenarioSteps(parsed.scenarios[0]);
    expect(expanded.scenes[0].steps.length).toBeGreaterThan(0);
    expect(expanded.scenes[0].steps.every((step) => step.type === 'action')).toBe(true);
  });
});
