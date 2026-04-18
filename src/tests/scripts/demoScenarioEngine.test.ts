import { describe, expect, it } from 'vitest';
import {
  parseScenarioRegistry,
  expandScenarioSteps,
  resolveScenarioSelection,
  applyTokens,
  createSubstitutionContext
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

  it('substitutes tokens in macro args before expansion', () => {
    const registry = {
      version: 2,
      scenarios: [
        {
          id: 'tokenized',
          title: 'Tokenized',
          description: 'Token check',
          flowToken: 'tokenized',
          scenes: [
            {
              id: 'open',
              title: 'Open details',
              route: '/dashboard',
              intent: 'open',
              steps: [
                { type: 'macro', name: 'openDetails', args: { name: 'Asset {{randSuffix}}' } }
              ]
            }
          ]
        }
      ]
    };
    const parsed = parseScenarioRegistry(registry);
    const substitution = createSubstitutionContext({ randSuffix: 'abc123' });
    const expanded = expandScenarioSteps(parsed.scenarios[0], { substitution });
    const click = expanded.scenes[0].steps.find((step) => step.action === 'clickByLabel');
    expect(click?.label).toBe('Open details for Asset abc123');
  });

  it('substitutes tokens in non-macro action steps', () => {
    const registry = {
      version: 2,
      scenarios: [
        {
          id: 'plain',
          title: 'Plain',
          description: 'Plain action token',
          flowToken: 'plain',
          scenes: [
            {
              id: 'fill',
              title: 'Fill name',
              route: '/dashboard/equipment',
              intent: 'fill',
              steps: [
                { type: 'action', action: 'fillRole', name: 'Equipment Name', value: 'Demo {{randSuffix}}' }
              ]
            }
          ]
        }
      ]
    };
    const parsed = parseScenarioRegistry(registry);
    const substitution = createSubstitutionContext({ randSuffix: 'xyz789' });
    const expanded = expandScenarioSteps(parsed.scenarios[0], { substitution });
    expect(expanded.scenes[0].steps[0].value).toBe('Demo xyz789');
  });
});

describe('applyTokens', () => {
  const ctx = createSubstitutionContext({
    randSuffix: 'cafe01',
    env: { DEMO_TEAM: 'Excavator Crew' },
    now: new Date(Date.UTC(2026, 3, 18))
  });

  it('replaces {{randSuffix}} tokens in strings', () => {
    expect(applyTokens('Excavator-{{randSuffix}}', ctx)).toBe('Excavator-cafe01');
  });

  it('replaces {{env:NAME}} from the supplied env map', () => {
    expect(applyTokens('Owner: {{env:DEMO_TEAM}}', ctx)).toBe('Owner: Excavator Crew');
  });

  it('uses fallback after pipe when env var is missing', () => {
    expect(applyTokens('Member: {{env:DEMO_MISSING|Default Operator}}', ctx)).toBe(
      'Member: Default Operator'
    );
  });

  it('uses fallback after pipe when env var is empty', () => {
    const localCtx = createSubstitutionContext({ env: { DEMO_EMPTY: '' } });
    expect(applyTokens('{{env:DEMO_EMPTY|fallback-value}}', localCtx)).toBe('fallback-value');
  });

  it('formats {{date:YYYY-MM-DD}} from the substitution clock', () => {
    expect(applyTokens('Captured {{date:YYYY-MM-DD}}', ctx)).toBe('Captured 2026-04-18');
  });

  it('leaves unknown tokens intact for visibility', () => {
    expect(applyTokens('keep {{unknown}} as-is', ctx)).toBe('keep {{unknown}} as-is');
  });

  it('walks objects and arrays recursively', () => {
    const out = applyTokens(
      {
        title: 'Asset {{randSuffix}}',
        tags: ['{{env:DEMO_TEAM}}', 'static'],
        nested: { description: 'Captured {{date:YYYY-MM-DD}}' }
      },
      ctx
    );
    expect(out).toEqual({
      title: 'Asset cafe01',
      tags: ['Excavator Crew', 'static'],
      nested: { description: 'Captured 2026-04-18' }
    });
  });

  it('passes through non-string scalars unchanged', () => {
    expect(applyTokens(42, ctx)).toBe(42);
    expect(applyTokens(true, ctx)).toBe(true);
    expect(applyTokens(null, ctx)).toBe(null);
  });
});
