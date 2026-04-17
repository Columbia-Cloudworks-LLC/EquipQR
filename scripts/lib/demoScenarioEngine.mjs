import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { sanitizeFlowToken } from './demoArtifactPaths.mjs';
import { expandDemoMacro } from './demoStepMacros.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultRegistryPath = path.resolve(__dirname, '..', 'demo-scenarios.v2.json');

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * @param {unknown} value
 * @param {string} name
 * @returns {string}
 */
function requiredString(value, name) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Invalid scenario registry: "${name}" must be a non-empty string.`);
  }
  return value.trim();
}

/**
 * @param {unknown} value
 * @param {string} name
 */
function ensureArray(value, name) {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid scenario registry: "${name}" must be an array.`);
  }
}

/**
 * @param {unknown} raw
 * @param {string} field
 * @returns {{ min: number, max: number } | null}
 */
function normalizeDurationRange(raw, field) {
  if (raw == null) {
    return null;
  }

  if (!isObject(raw)) {
    throw new Error(`Invalid scenario registry: "${field}" must be an object with min/max.`);
  }

  const min = Number(raw.min);
  const max = Number(raw.max);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= 0 || min > max) {
    throw new Error(
      `Invalid scenario registry: "${field}" must include numeric min/max where 0 < min <= max.`
    );
  }

  return { min, max };
}

/**
 * @param {unknown} rawCheckpoint
 * @param {string} context
 */
function normalizeCheckpoint(rawCheckpoint, context) {
  if (!isObject(rawCheckpoint)) {
    throw new Error(`Invalid scenario registry: ${context} checkpoint must be an object.`);
  }

  const id = requiredString(rawCheckpoint.id, `${context}.checkpoint.id`);
  const type = requiredString(rawCheckpoint.type, `${context}.checkpoint.type`);
  const value = typeof rawCheckpoint.value === 'string' ? rawCheckpoint.value : undefined;
  const text = typeof rawCheckpoint.text === 'string' ? rawCheckpoint.text : undefined;

  if (!value && !text) {
    throw new Error(`Invalid scenario registry: checkpoint "${id}" requires either "value" or "text".`);
  }

  return { id, type, value, text };
}

/**
 * @param {unknown} rawStep
 * @param {string} context
 */
function normalizeStep(rawStep, context) {
  if (!isObject(rawStep)) {
    throw new Error(`Invalid scenario registry: ${context} step must be an object.`);
  }

  const type = requiredString(rawStep.type, `${context}.type`);
  if (type === 'macro') {
    return {
      type: 'macro',
      name: requiredString(rawStep.name, `${context}.name`),
      args: isObject(rawStep.args) ? rawStep.args : undefined
    };
  }

  if (type === 'action') {
    return {
      ...rawStep,
      type: 'action',
      action: requiredString(rawStep.action, `${context}.action`)
    };
  }

  throw new Error(`Invalid scenario registry: unsupported step type "${type}" at ${context}.`);
}

/**
 * @param {unknown} rawScene
 * @param {string} scenarioId
 */
function normalizeScene(rawScene, scenarioId) {
  if (!isObject(rawScene)) {
    throw new Error(`Invalid scenario registry: scene in scenario "${scenarioId}" must be an object.`);
  }

  const id = requiredString(rawScene.id, `scenarios.${scenarioId}.scene.id`);
  ensureArray(rawScene.steps, `scenarios.${scenarioId}.scene.${id}.steps`);

  return {
    id,
    title: requiredString(rawScene.title, `scenarios.${scenarioId}.scene.${id}.title`),
    route: requiredString(rawScene.route, `scenarios.${scenarioId}.scene.${id}.route`),
    intent: requiredString(rawScene.intent, `scenarios.${scenarioId}.scene.${id}.intent`),
    targetDurationMs: normalizeDurationRange(
      rawScene.targetDurationMs,
      `scenarios.${scenarioId}.scene.${id}.targetDurationMs`
    ),
    requiredCheckpoints: Array.isArray(rawScene.requiredCheckpoints)
      ? rawScene.requiredCheckpoints.map((checkpoint, index) =>
          normalizeCheckpoint(
            checkpoint,
            `scenarios.${scenarioId}.scene.${id}.requiredCheckpoints[${index}]`
          )
        )
      : [],
    metadata: isObject(rawScene.metadata) ? rawScene.metadata : {},
    steps: rawScene.steps.map((step, index) =>
      normalizeStep(step, `scenarios.${scenarioId}.scene.${id}.steps[${index}]`)
    )
  };
}

/**
 * @param {unknown} rawScenario
 */
function normalizeScenario(rawScenario) {
  if (!isObject(rawScenario)) {
    throw new Error('Invalid scenario registry: each scenario must be an object.');
  }

  const id = requiredString(rawScenario.id, 'scenario.id');
  ensureArray(rawScenario.scenes, `scenarios.${id}.scenes`);
  const flowToken = sanitizeFlowToken(
    typeof rawScenario.flowToken === 'string' ? rawScenario.flowToken : id
  );

  return {
    id,
    title: requiredString(rawScenario.title, `scenarios.${id}.title`),
    description: requiredString(rawScenario.description, `scenarios.${id}.description`),
    flowToken,
    personaId: typeof rawScenario.personaId === 'string' ? rawScenario.personaId : null,
    targetDurationMs: normalizeDurationRange(rawScenario.targetDurationMs, `scenarios.${id}.targetDurationMs`),
    metadata: isObject(rawScenario.metadata) ? rawScenario.metadata : {},
    scenes: rawScenario.scenes.map((scene) => normalizeScene(scene, id))
  };
}

/**
 * @param {unknown} rawRegistry
 */
export function parseScenarioRegistry(rawRegistry) {
  if (!isObject(rawRegistry)) {
    throw new Error('Invalid scenario registry: expected a top-level object.');
  }

  if (Number(rawRegistry.version) !== 2) {
    throw new Error('Invalid scenario registry: version must be 2.');
  }

  ensureArray(rawRegistry.scenarios, 'scenarios');
  const scenarios = rawRegistry.scenarios.map((scenario) => normalizeScenario(scenario));
  const scenarioIds = new Set();
  for (const scenario of scenarios) {
    if (scenarioIds.has(scenario.id)) {
      throw new Error(`Invalid scenario registry: duplicate scenario id "${scenario.id}".`);
    }
    scenarioIds.add(scenario.id);

    const sceneIds = new Set();
    for (const scene of scenario.scenes) {
      if (sceneIds.has(scene.id)) {
        throw new Error(`Invalid scenario registry: duplicate scene id "${scene.id}" in scenario "${scenario.id}".`);
      }
      sceneIds.add(scene.id);
    }
  }

  const personas = isObject(rawRegistry.personas) ? rawRegistry.personas : {};
  const suites = isObject(rawRegistry.suites) ? rawRegistry.suites : {};
  for (const [suiteName, suiteScenarioIds] of Object.entries(suites)) {
    if (!Array.isArray(suiteScenarioIds)) {
      throw new Error(`Invalid scenario registry: suite "${suiteName}" must be an array.`);
    }
    for (const scenarioId of suiteScenarioIds) {
      if (typeof scenarioId !== 'string' || !scenarioIds.has(scenarioId)) {
        throw new Error(`Invalid scenario registry: suite "${suiteName}" references unknown scenario "${scenarioId}".`);
      }
    }
  }

  return {
    version: 2,
    metadata: isObject(rawRegistry.metadata) ? rawRegistry.metadata : {},
    personas,
    suites,
    scenarios
  };
}

/**
 * @param {{ registryPath?: string }} [opts]
 */
export async function loadScenarioRegistry(opts = {}) {
  const registryPath = opts.registryPath || defaultRegistryPath;
  const raw = await fs.readFile(registryPath, 'utf8');
  const parsed = JSON.parse(raw);
  const registry = parseScenarioRegistry(parsed);
  return { registry, registryPath };
}

/**
 * @param {ReturnType<typeof parseScenarioRegistry>} registry
 * @param {{ scenarioId?: string | null, suite?: string | null }} selection
 */
export function resolveScenarioSelection(registry, selection) {
  if (selection.scenarioId) {
    const scenario = registry.scenarios.find((item) => item.id === selection.scenarioId);
    if (!scenario) {
      throw new Error(
        `Unknown scenario "${selection.scenarioId}". Available: ${registry.scenarios
          .map((item) => item.id)
          .join(', ')}`
      );
    }
    return [scenario];
  }

  if (selection.suite) {
    const ids = registry.suites[selection.suite];
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error(
        `Unknown suite "${selection.suite}". Available: ${Object.keys(registry.suites).join(', ')}`
      );
    }
    return ids.map((id) => registry.scenarios.find((item) => item.id === id)).filter(Boolean);
  }

  return registry.scenarios;
}

/**
 * @param {ReturnType<typeof normalizeScenario>} scenario
 */
export function expandScenarioSteps(scenario) {
  return {
    ...scenario,
    scenes: scenario.scenes.map((scene) => ({
      ...scene,
      steps: scene.steps.flatMap((step, index) => {
        if (step.type !== 'macro') {
          return [{ ...step, sourceStepIndex: index }];
        }

        return expandDemoMacro(step).map((expandedStep) => ({
          ...expandedStep,
          sourceStepIndex: index
        }));
      })
    }))
  };
}

/**
 * @param {ReturnType<typeof parseScenarioRegistry>} registry
 */
export function listScenarioSummaries(registry) {
  return registry.scenarios.map((scenario) => ({
    id: scenario.id,
    title: scenario.title,
    flowToken: scenario.flowToken,
    personaId: scenario.personaId,
    sceneCount: scenario.scenes.length,
    suites: Object.entries(registry.suites)
      .filter(([, ids]) => Array.isArray(ids) && ids.includes(scenario.id))
      .map(([name]) => name)
  }));
}
