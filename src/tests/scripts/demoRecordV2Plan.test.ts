import { describe, expect, it } from 'vitest';
import { parseArgs } from '../../../scripts/demo-record-v2.mjs';
import {
  loadScenarioRegistry,
  expandScenarioSteps,
  createSubstitutionContext
} from '../../../scripts/lib/demoScenarioEngine.mjs';
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

  it('resolves and expands the equipmentLifecycleE2E scenario end-to-end', async () => {
    const { registry } = await loadScenarioRegistry();
    const plan = buildOrchestratorPlan({ registry, scenarioId: 'equipmentLifecycleE2E' });
    expect(plan).toHaveLength(1);
    expect(plan[0].scenarioId).toBe('equipmentLifecycleE2E');
    expect(plan[0].sceneCount).toBeGreaterThanOrEqual(6);

    const substitution = createSubstitutionContext({ randSuffix: 'fixed01' });
    const scenario = registry.scenarios.find((entry) => entry.id === 'equipmentLifecycleE2E');
    expect(scenario).toBeDefined();
    const expanded = expandScenarioSteps(scenario!, { substitution });
    const allSteps = expanded.scenes.flatMap((scene) => scene.steps);
    expect(allSteps.every((step) => step.type === 'action')).toBe(true);
    const stepValues = allSteps
      .map((step) => (typeof step.value === 'string' ? step.value : ''))
      .join(' ');
    expect(stepValues).toContain('fixed01');
  });
});
