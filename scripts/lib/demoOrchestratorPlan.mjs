import { resolveScenarioSelection, expandScenarioSteps } from './demoScenarioEngine.mjs';

/**
 * @param {{
 *  registry: import('./demoScenarioEngine.mjs').parseScenarioRegistry extends (...args: any[]) => infer R ? R : never,
 *  scenarioId?: string | null,
 *  suite?: string | null
 * }} opts
 */
export function buildOrchestratorPlan(opts) {
  const selected = resolveScenarioSelection(opts.registry, {
    scenarioId: opts.scenarioId || null,
    suite: opts.suite || null
  });

  return selected.map((scenario) => {
    const expanded = expandScenarioSteps(scenario);
    return {
      scenarioId: expanded.id,
      title: expanded.title,
      flowToken: expanded.flowToken,
      sceneCount: expanded.scenes.length,
      scenes: expanded.scenes.map((scene) => ({
        sceneId: scene.id,
        title: scene.title,
        route: scene.route,
        stepCount: scene.steps.length
      }))
    };
  });
}
