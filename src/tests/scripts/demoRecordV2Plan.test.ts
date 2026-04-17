import { describe, expect, it } from 'vitest';
import { parseArgs } from '../../../scripts/demo-record-v2.mjs';
import { loadScenarioRegistry } from '../../../scripts/lib/demoScenarioEngine.mjs';
import { buildOrchestratorPlan } from '../../../scripts/lib/demoOrchestratorPlan.mjs';

describe('demo-record-v2 planning smoke', () => {
  it('parses dry-run suite args and builds executable plan', async () => {
    const args = parseArgs(['suite', '--suite=core', '--dry-run']);
    expect(args.mode).toBe('suite');
    expect(args.suite).toBe('core');
    expect(args.dryRun).toBe(true);

    const { registry } = await loadScenarioRegistry();
    const plan = buildOrchestratorPlan({
      registry,
      suite: args.suite
    });

    expect(plan.length).toBeGreaterThan(0);
    expect(plan[0].scenes.length).toBeGreaterThan(0);
  });
});
