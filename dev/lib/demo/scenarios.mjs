import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { RECORDING_VIEWPORT } from '../recording-quality.mjs';
import { sanitizeFlowToken } from './artifacts.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultRegistryPath = path.resolve(__dirname, '..', '..', 'demo-scenarios.v2.json');
const scenariosPath = path.join(__dirname, '..', '..', 'demo-scenarios.json');

/**
 * @typedef {{ type: 'action', action: string, [key: string]: unknown }} DemoActionStep
 * @typedef {{ type: 'macro', name: string, args?: Record<string, unknown> }} DemoMacroStep
 * @typedef {object} DemoGifCliArgs
 * @property {string | null} scenarioName
 * @property {boolean} listOnly
 * @property {string | null} category
 * @property {string | null} audience
 * @property {string | null} tag
 * @property {boolean} videoOnly
 * @property {boolean} smoke
 * @property {string} baseUrl
 * @property {string | null} out
 * @property {string | null} persona
 */

const DEFAULT_BASE_URL = 'http://localhost:8080';

export const defaultViewportByProfile = {
  desktop: RECORDING_VIEWPORT,
  mobile: { width: 390, height: 844 },
};

/**
 * @param {unknown} value
 * @returns {string}
 */
function toText(value) {
  return typeof value === 'string' ? value : '';
}

/**
 * @param {Record<string, unknown> | undefined} args
 * @returns {DemoActionStep[]}
 */
function openNavMacro(args) {
  const label = toText(args?.label) || 'Dashboard';
  return [
    {
      type: 'action',
      action: 'clickRole',
      role: 'link',
      name: label,
      fallbackSelectors: ['a', 'button,[role="button"]'],
      required: false,
    },
    {
      type: 'action',
      action: 'pauseReadable',
      ms: 700,
    },
  ];
}

/**
 * @param {Record<string, unknown> | undefined} args
 * @returns {DemoActionStep[]}
 */
function filterListMacro(args) {
  const value = toText(args?.value) || 'low stock';
  return [
    {
      type: 'action',
      action: 'focusElement',
      selector: 'input[type="search"],input[placeholder*="search" i],input[name*="search" i]',
      required: false,
    },
    {
      type: 'action',
      action: 'fillRole',
      name: 'Search',
      value,
      fallbackSelectors: [
        'input[type="search"]',
        'input[placeholder*="search" i]',
        'input[name*="search" i]',
      ],
      required: false,
    },
    {
      type: 'action',
      action: 'pauseReadable',
      ms: 900,
    },
  ];
}

/**
 * @param {Record<string, unknown> | undefined} args
 * @returns {DemoActionStep[]}
 */
function openDetailsMacro(args) {
  const name = toText(args?.name);
  if (name) {
    return [
      {
        type: 'action',
        action: 'clickByLabel',
        label: `Open details for ${name}`,
      },
      {
        type: 'action',
        action: 'pauseReadable',
        ms: 1000,
      },
    ];
  }
  const kind = toText(args?.kind) || 'record';
  return [
    {
      type: 'action',
      action: 'clickText',
      text: kind.includes('work') ? 'Work Orders|Open' : 'Open|Details|Equipment',
      regex: true,
      selector: 'a,button,[role="button"],tr[role="button"]',
      required: false,
    },
    {
      type: 'action',
      action: 'pauseReadable',
      ms: 1000,
    },
  ];
}

/**
 * @returns {DemoActionStep[]}
 */
function returnDashboardMacro() {
  return [
    {
      type: 'action',
      action: 'navigateWithWait',
      route: '/dashboard',
    },
    {
      type: 'action',
      action: 'pauseReadable',
      ms: 900,
    },
  ];
}

/**
 * @param {Record<string, unknown> | undefined} args
 * @returns {DemoActionStep[]}
 */
function createEquipmentMacro(args) {
  const manufacturer = toText(args?.manufacturer) || 'Komatsu';
  const model = toText(args?.model) || 'PC210LC-11';
  const name = toText(args?.name) || `${manufacturer} ${model}`;
  const serial = toText(args?.serial) || 'DEMO-SERIAL';
  const location = toText(args?.location) || 'Main Yard';
  const description = toText(args?.description) || '';
  const status = toText(args?.status) || 'Active';

  const steps = /** @type {DemoActionStep[]} */ ([
    { type: 'action', action: 'clickRole', role: 'button', name: 'Add Equipment' },
    { type: 'action', action: 'pauseReadable', ms: 700 },
    { type: 'action', action: 'fillRole', name: 'Manufacturer', value: manufacturer },
    { type: 'action', action: 'pressEscape' },
    { type: 'action', action: 'fillRole', name: 'Model', value: model },
    { type: 'action', action: 'fillRole', name: 'Equipment Name', value: name },
    { type: 'action', action: 'fillRole', name: 'Serial Number', value: serial },
    { type: 'action', action: 'fillRole', name: 'Location Description', value: location },
  ]);

  if (description) {
    steps.push({
      type: 'action',
      action: 'fillRole',
      name: 'Description',
      value: description,
      fallbackSelectors: ['textarea[placeholder*="Additional information" i]', 'textarea'],
    });
  }

  if (status && status.toLowerCase() !== 'active') {
    steps.push({
      type: 'action',
      action: 'selectOption',
      selector: '[id$="status"],select[name="status"]',
      value: status.toLowerCase(),
    });
  }

  steps.push(
    { type: 'action', action: 'clickRole', role: 'button', name: 'Create Equipment' },
    { type: 'action', action: 'pauseReadable', ms: 1500 },
  );

  return steps;
}

/**
 * @param {Record<string, unknown> | undefined} args
 * @returns {DemoActionStep[]}
 */
function addCustomAttributeMacro(args) {
  const name = toText(args?.name) || 'Attribute';
  const value = toText(args?.value) || '';
  const andSave = args?.andSave !== false;

  return [
    {
      type: 'action',
      action: 'clickHiddenButton',
      label: 'Edit custom attributes',
      parentSelector: '[data-section="custom-attributes"],section,article,div',
    },
    { type: 'action', action: 'pauseReadable', ms: 400 },
    { type: 'action', action: 'clickRole', role: 'button', name: 'Add Attribute' },
    { type: 'action', action: 'pauseReadable', ms: 300 },
    {
      type: 'action',
      action: 'fillRole',
      name: 'Attribute Name',
      value: name,
      fallbackSelectors: ['input[placeholder="Attribute name"]'],
    },
    {
      type: 'action',
      action: 'fillRole',
      name: 'Attribute Value',
      value: value,
      fallbackSelectors: ['input[placeholder="Attribute value"]'],
    },
    ...(andSave
      ? /** @type {DemoActionStep[]} */ ([
          { type: 'action', action: 'clickRole', role: 'button', name: 'Save' },
          { type: 'action', action: 'pauseReadable', ms: 900 },
        ])
      : /** @type {DemoActionStep[]} */ ([])),
  ];
}

/**
 * @param {Record<string, unknown> | undefined} args
 * @returns {DemoActionStep[]}
 */
function addEquipmentNoteMacro(args) {
  const content = toText(args?.content) || 'Note added during demo recording.';
  const machineHours = Number.isFinite(Number(args?.machineHours))
    ? String(args?.machineHours)
    : '';

  const steps = /** @type {DemoActionStep[]} */ ([
    {
      type: 'action',
      action: 'fillRole',
      name: 'Note content',
      value: content,
      fallbackSelectors: ['textarea[placeholder*="Enter your note" i]', 'textarea'],
    },
  ]);

  if (machineHours) {
    steps.push({
      type: 'action',
      action: 'fillNumberInput',
      name: 'Machine Hours',
      value: machineHours,
    });
  }

  steps.push(
    { type: 'action', action: 'clickRole', role: 'button', name: 'Add Note' },
    { type: 'action', action: 'pauseReadable', ms: 1200 },
  );

  return steps;
}

/**
 * @param {Record<string, unknown> | undefined} args
 * @returns {DemoActionStep[]}
 */
function createTeamMacro(args) {
  const name = toText(args?.name) || 'Demo Team';
  const description = toText(args?.description) || '';

  const steps = /** @type {DemoActionStep[]} */ ([
    { type: 'action', action: 'clickRole', role: 'button', name: 'Create Team' },
    { type: 'action', action: 'pauseReadable', ms: 600 },
    { type: 'action', action: 'fillRole', name: 'Team Name', value: name },
  ]);

  if (description) {
    steps.push({ type: 'action', action: 'fillRole', name: 'Description', value: description });
  }

  steps.push(
    { type: 'action', action: 'clickRole', role: 'button', name: 'Create' },
    { type: 'action', action: 'pauseReadable', ms: 1200 },
  );

  return steps;
}

/**
 * @param {Record<string, unknown> | undefined} args
 * @returns {DemoActionStep[]}
 */
function addTeamMemberMacro(args) {
  const member = toText(args?.name) || '';

  return [
    { type: 'action', action: 'clickRole', role: 'button', name: 'Add Member' },
    { type: 'action', action: 'pauseReadable', ms: 600 },
    {
      type: 'action',
      action: 'fillRole',
      name: 'Member',
      value: member,
      fallbackSelectors: [
        'input[placeholder*="Search" i]',
        'input[placeholder*="member" i]',
        'input[type="text"]',
      ],
      required: false,
    },
    { type: 'action', action: 'pauseReadable', ms: 600 },
    {
      type: 'action',
      action: 'clickText',
      text: member,
      selector: '[role="option"],li,button',
      required: false,
    },
    { type: 'action', action: 'clickRole', role: 'button', name: 'Add', required: false },
    { type: 'action', action: 'pauseReadable', ms: 900 },
  ];
}

/**
 * @param {Record<string, unknown> | undefined} args
 * @returns {DemoActionStep[]}
 */
function assignTeamToEquipmentMacro(args) {
  const teamName = toText(args?.teamName) || '';

  return [
    { type: 'action', action: 'clickByLabel', label: 'Edit assigned team' },
    { type: 'action', action: 'pauseReadable', ms: 500 },
    {
      type: 'action',
      action: 'clickText',
      text: teamName,
      selector: '[role="option"],li,button',
      required: false,
    },
    { type: 'action', action: 'clickRole', role: 'button', name: 'Save', required: false },
    { type: 'action', action: 'pauseReadable', ms: 900 },
  ];
}

/**
 * @param {Record<string, unknown> | undefined} args
 * @returns {DemoActionStep[]}
 */
function setPmTemplateMacro(args) {
  const templateName = toText(args?.templateName) || '';

  return [
    { type: 'action', action: 'clickByLabel', label: 'Edit PM template' },
    { type: 'action', action: 'pauseReadable', ms: 500 },
    {
      type: 'action',
      action: 'clickText',
      text: templateName,
      selector: '[role="option"],li,button',
      required: false,
    },
    { type: 'action', action: 'clickRole', role: 'button', name: 'Save', required: false },
    { type: 'action', action: 'pauseReadable', ms: 900 },
  ];
}

/**
 * @param {Record<string, unknown> | undefined} args
 * @returns {DemoActionStep[]}
 */
function createPmWorkOrderMacro(args) {
  const title = toText(args?.title) || 'PM work order';
  const templateName = toText(args?.templateName) || '';
  const machineHours = Number.isFinite(Number(args?.machineHours))
    ? String(args?.machineHours)
    : '';

  const steps = /** @type {DemoActionStep[]} */ ([
    { type: 'action', action: 'clickRole', role: 'button', name: 'Work Order' },
    { type: 'action', action: 'pauseReadable', ms: 700 },
    {
      type: 'action',
      action: 'clickText',
      text: 'Preventative Maintenance|PM',
      regex: true,
      selector: '[role="option"],button,label',
      required: false,
    },
    { type: 'action', action: 'fillRole', name: 'Title', value: title },
  ]);

  if (templateName) {
    steps.push(
      { type: 'action', action: 'clickByLabel', label: 'Select PM template', required: false },
      {
        type: 'action',
        action: 'clickText',
        text: templateName,
        selector: '[role="option"],li,button',
        required: false,
      },
    );
  }

  if (machineHours) {
    steps.push({
      type: 'action',
      action: 'fillNumberInput',
      name: 'Machine Hours',
      value: machineHours,
    });
  }

  steps.push(
    { type: 'action', action: 'clickRole', role: 'button', name: 'Create Work Order' },
    { type: 'action', action: 'pauseReadable', ms: 1500 },
  );

  return steps;
}

const macroImplementations = {
  openNav: openNavMacro,
  filterList: filterListMacro,
  openDetails: openDetailsMacro,
  returnDashboard: returnDashboardMacro,
  createEquipment: createEquipmentMacro,
  addCustomAttribute: addCustomAttributeMacro,
  addEquipmentNote: addEquipmentNoteMacro,
  createTeam: createTeamMacro,
  addTeamMember: addTeamMemberMacro,
  assignTeamToEquipment: assignTeamToEquipmentMacro,
  setPmTemplate: setPmTemplateMacro,
  createPmWorkOrder: createPmWorkOrderMacro,
};

/**
 * @returns {string[]}
 */
export function listDemoMacros() {
  return Object.keys(macroImplementations);
}

/**
 * @param {DemoMacroStep} step
 * @returns {DemoActionStep[]}
 */
export function expandDemoMacro(step) {
  const fn = macroImplementations[step.name];
  if (!fn) {
    throw new Error(`Unknown demo macro "${step.name}". Available: ${listDemoMacros().join(', ')}`);
  }

  return fn(step.args).map((expandedStep, index) => ({
    ...expandedStep,
    sourceMacro: step.name,
    sourceMacroStepIndex: index,
  }));
}

/**
 * @param {Date} date
 * @param {string} format
 * @returns {string}
 */
function formatDateToken(date, format) {
  const yyyy = String(date.getUTCFullYear());
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  if (format === 'YYYY-MM-DD') return `${yyyy}-${mm}-${dd}`;
  return date.toISOString();
}

/**
 * @param {{ randSuffix?: string, env?: Record<string, string | undefined>, now?: Date }} [opts]
 */
export function createSubstitutionContext(opts = {}) {
  const randSuffix =
    typeof opts.randSuffix === 'string' && opts.randSuffix
      ? opts.randSuffix
      : crypto.randomBytes(3).toString('hex');
  return {
    randSuffix,
    env: opts.env || process.env,
    now: opts.now instanceof Date ? opts.now : new Date(),
  };
}

/**
 * @param {string} value
 * @param {ReturnType<typeof createSubstitutionContext>} ctx
 * @returns {string}
 */
function applyTokensToString(value, ctx) {
  return value.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match, body) => {
    const trimmed = String(body).trim();
    if (trimmed === 'randSuffix') return ctx.randSuffix;
    if (trimmed.startsWith('env:')) {
      const rest = trimmed.slice(4);
      const [name, fallback = ''] = rest.split('|', 2);
      const envValue = ctx.env?.[name.trim()];
      return typeof envValue === 'string' && envValue.length > 0 ? envValue : fallback;
    }
    if (trimmed.startsWith('date:')) {
      return formatDateToken(ctx.now, trimmed.slice(5).trim());
    }
    return match;
  });
}

/**
 * @param {unknown} value
 * @param {ReturnType<typeof createSubstitutionContext>} ctx
 * @returns {unknown}
 */
export function applyTokens(value, ctx) {
  if (typeof value === 'string') return applyTokensToString(value, ctx);
  if (Array.isArray(value)) return value.map((item) => applyTokens(item, ctx));
  if (value && typeof value === 'object') {
    const out = /** @type {Record<string, unknown>} */ ({});
    for (const [key, item] of Object.entries(value)) {
      out[key] = applyTokens(item, ctx);
    }
    return out;
  }
  return value;
}

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
      `Invalid scenario registry: "${field}" must include numeric min/max where 0 < min <= max.`,
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
    throw new Error(
      `Invalid scenario registry: checkpoint "${id}" requires either "value" or "text".`,
    );
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
      args: isObject(rawStep.args) ? rawStep.args : undefined,
    };
  }

  if (type === 'action') {
    return {
      ...rawStep,
      type: 'action',
      action: requiredString(rawStep.action, `${context}.action`),
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
    throw new Error(
      `Invalid scenario registry: scene in scenario "${scenarioId}" must be an object.`,
    );
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
      `scenarios.${scenarioId}.scene.${id}.targetDurationMs`,
    ),
    requiredCheckpoints: Array.isArray(rawScene.requiredCheckpoints)
      ? rawScene.requiredCheckpoints.map((checkpoint, index) =>
          normalizeCheckpoint(
            checkpoint,
            `scenarios.${scenarioId}.scene.${id}.requiredCheckpoints[${index}]`,
          ),
        )
      : [],
    metadata: isObject(rawScene.metadata) ? rawScene.metadata : {},
    steps: rawScene.steps.map((step, index) =>
      normalizeStep(step, `scenarios.${scenarioId}.scene.${id}.steps[${index}]`),
    ),
  };
}

/**
 * @param {unknown} rawScenario
 */
function normalizeV2Scenario(rawScenario) {
  if (!isObject(rawScenario)) {
    throw new Error('Invalid scenario registry: each scenario must be an object.');
  }

  const id = requiredString(rawScenario.id, 'scenario.id');
  ensureArray(rawScenario.scenes, `scenarios.${id}.scenes`);
  const flowToken = sanitizeFlowToken(
    typeof rawScenario.flowToken === 'string' ? rawScenario.flowToken : id,
  );

  return {
    id,
    title: requiredString(rawScenario.title, `scenarios.${id}.title`),
    description: requiredString(rawScenario.description, `scenarios.${id}.description`),
    flowToken,
    personaId: typeof rawScenario.personaId === 'string' ? rawScenario.personaId : null,
    targetDurationMs: normalizeDurationRange(
      rawScenario.targetDurationMs,
      `scenarios.${id}.targetDurationMs`,
    ),
    metadata: isObject(rawScenario.metadata) ? rawScenario.metadata : {},
    scenes: rawScenario.scenes.map((scene) => normalizeScene(scene, id)),
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
  const scenarios = rawRegistry.scenarios.map((scenario) => normalizeV2Scenario(scenario));
  const scenarioIds = new Set();
  for (const scenario of scenarios) {
    if (scenarioIds.has(scenario.id)) {
      throw new Error(`Invalid scenario registry: duplicate scenario id "${scenario.id}".`);
    }
    scenarioIds.add(scenario.id);

    const sceneIds = new Set();
    for (const scene of scenario.scenes) {
      if (sceneIds.has(scene.id)) {
        throw new Error(
          `Invalid scenario registry: duplicate scene id "${scene.id}" in scenario "${scenario.id}".`,
        );
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
        throw new Error(
          `Invalid scenario registry: suite "${suiteName}" references unknown scenario "${scenarioId}".`,
        );
      }
    }
  }

  return {
    version: 2,
    metadata: isObject(rawRegistry.metadata) ? rawRegistry.metadata : {},
    personas,
    suites,
    scenarios,
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
          .join(', ')}`,
      );
    }
    return [scenario];
  }

  if (selection.suite) {
    const ids = registry.suites[selection.suite];
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error(
        `Unknown suite "${selection.suite}". Available: ${Object.keys(registry.suites).join(', ')}`,
      );
    }
    return ids.map((id) => registry.scenarios.find((item) => item.id === id)).filter(Boolean);
  }

  return registry.scenarios;
}

/**
 * @param {ReturnType<typeof normalizeV2Scenario>} scenario
 * @param {{ substitution?: ReturnType<typeof createSubstitutionContext> }} [opts]
 */
export function expandScenarioSteps(scenario, opts = {}) {
  const substitution = opts.substitution;
  const substitute = (value) => (substitution ? applyTokens(value, substitution) : value);

  return {
    ...scenario,
    scenes: scenario.scenes.map((scene) => ({
      ...scene,
      steps: scene.steps.flatMap((step, index) => {
        if (step.type !== 'macro') {
          return [{ ...substitute(step), sourceStepIndex: index }];
        }

        const substitutedMacro = substitute(step);
        return expandDemoMacro(substitutedMacro).map((expandedStep) => ({
          ...expandedStep,
          sourceStepIndex: index,
        }));
      }),
    })),
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
      .map(([name]) => name),
  }));
}

/**
 * @param {{
 *  registry: ReturnType<typeof parseScenarioRegistry>,
 *  scenarioId?: string | null,
 *  suite?: string | null
 * }} opts
 */
export function buildOrchestratorPlan(opts) {
  const selected = resolveScenarioSelection(opts.registry, {
    scenarioId: opts.scenarioId || null,
    suite: opts.suite || null,
  });

  return selected.map((scenario) => {
    const expanded = expandScenarioSteps(scenario);
    return {
      scenarioId: expanded.id,
      title: expanded.title,
      flowToken: expanded.flowToken,
      viewport: RECORDING_VIEWPORT,
      videoSize: RECORDING_VIEWPORT,
      sceneCount: expanded.scenes.length,
      scenes: expanded.scenes.map((scene) => ({
        sceneId: scene.id,
        title: scene.title,
        route: scene.route,
        stepCount: scene.steps.length,
      })),
    };
  });
}

/**
 * @param {string[]} argv
 * @returns {DemoGifCliArgs}
 */
export function parseDemoGifArgs(argv) {
  /** @type {DemoGifCliArgs} */
  const parsed = {
    scenarioName: null,
    listOnly: false,
    category: null,
    audience: null,
    tag: null,
    videoOnly: false,
    smoke: false,
    baseUrl: DEFAULT_BASE_URL,
    out: null,
    persona: null,
  };

  for (const arg of argv) {
    if (arg === '--list') {
      parsed.listOnly = true;
      continue;
    }
    if (arg === '--video-only') {
      parsed.videoOnly = true;
      continue;
    }
    if (arg === '--smoke') {
      parsed.smoke = true;
      continue;
    }
    if (arg.startsWith('--category=')) {
      parsed.category = arg.split('=')[1] || null;
      continue;
    }
    if (arg.startsWith('--audience=')) {
      parsed.audience = arg.split('=')[1] || null;
      continue;
    }
    if (arg.startsWith('--tag=')) {
      parsed.tag = arg.split('=')[1] || null;
      continue;
    }
    if (arg.startsWith('--base-url=')) {
      const raw = arg.slice('--base-url='.length).trim();
      parsed.baseUrl = normalizeBaseUrl(raw);
      continue;
    }
    if (arg.startsWith('--out=')) {
      parsed.out = arg.slice('--out='.length).trim() || null;
      continue;
    }
    if (arg.startsWith('--persona=')) {
      parsed.persona = arg.slice('--persona='.length).trim() || null;
      continue;
    }
    if (!arg.startsWith('--') && !parsed.scenarioName) {
      parsed.scenarioName = arg;
    }
  }

  if (parsed.smoke) {
    parsed.videoOnly = true;
  }

  if (parsed.smoke && parsed.scenarioName) {
    throw new Error('Invalid arguments: use either --smoke or a scenario name, not both.');
  }

  validateBaseUrl(parsed.baseUrl);
  if (parsed.out) {
    validateOutPath(parsed.out);
  }

  return parsed;
}

/**
 * @param {string} raw
 */
export function normalizeBaseUrl(raw) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return DEFAULT_BASE_URL;
  }
  return trimmed.replace(/\/+$/, '');
}

/**
 * @param {string} baseUrl
 */
export function validateBaseUrl(baseUrl) {
  let url;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error(`Invalid --base-url: "${baseUrl}" is not a valid URL.`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Invalid --base-url: only http and https are allowed (got ${url.protocol}).`);
  }
}

/**
 * @param {string} out
 */
export function validateOutPath(out) {
  const normalized = out.replace(/\\/g, '/');
  if (normalized.includes('..')) {
    throw new Error('Invalid --out: path must not contain "..".');
  }
  if (!normalized.toLowerCase().endsWith('.webm')) {
    throw new Error('Invalid --out: must end with .webm');
  }
}

/**
 * @param {string} baseUrl
 */
export function isLocalhostBaseUrl(baseUrl) {
  try {
    const { hostname } = new URL(baseUrl);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

/**
 * @param {{ out: string | null, defaultBasename?: string }} opts
 * @returns {string}
 */
export function resolveSmokeWebmRelativePath({ out, defaultBasename = 'demo-smoke' }) {
  if (!out) {
    return `tmp/demos/${defaultBasename}.webm`;
  }
  const normalized = out.replace(/\\/g, '/');
  validateOutPath(normalized);
  if (normalized.startsWith('tmp/')) {
    return normalized;
  }
  const base = normalized.split('/').pop();
  return `tmp/demos/${base}`;
}

/**
 * @param {string} scenarioName
 */
export function resolveScenarioWebmRelativePath(scenarioName) {
  const safe = scenarioName.replace(/[/\\]/g, '_');
  return `tmp/demos/${safe}.webm`;
}

/**
 * @param {Record<string, unknown>} rawScenario
 */
export function normalizeScenario(rawScenario) {
  return {
    name: rawScenario.name,
    description: rawScenario.description || '',
    route: rawScenario.route || '/dashboard',
    category: rawScenario.category || 'general',
    audience: rawScenario.audience || 'both',
    viewport: rawScenario.viewport || 'desktop',
    tags: Array.isArray(rawScenario.tags) ? rawScenario.tags : [],
    prerequisites: Array.isArray(rawScenario.prerequisites) ? rawScenario.prerequisites : [],
    auth: rawScenario.auth || { persona: 'Alex Apex', role: 'Owner' },
    steps: Array.isArray(rawScenario.steps) ? rawScenario.steps : [],
  };
}

export async function loadManifest() {
  const manifestRaw = await fs.readFile(scenariosPath, 'utf8');
  const manifest = JSON.parse(manifestRaw);
  const scenarios = Array.isArray(manifest?.scenarios)
    ? manifest.scenarios.map(normalizeScenario)
    : [];

  return { manifest, scenarios };
}

/**
 * @param {ReturnType<typeof normalizeScenario>} scenario
 * @param {{ category?: string, audience?: string, tag?: string }} filters
 */
export function scenarioMatchesFilters(scenario, { category, audience, tag }) {
  if (category && scenario.category !== category) {
    return false;
  }
  if (audience && scenario.audience !== audience && scenario.audience !== 'both') {
    return false;
  }
  if (tag && !scenario.tags.includes(tag)) {
    return false;
  }
  return true;
}

/**
 * @param {ReturnType<typeof normalizeScenario>[]} scenarios
 * @param {{ category?: string, audience?: string, tag?: string }} [filters]
 */
export function printScenarioList(scenarios, filters = {}) {
  const filtered = scenarios.filter((scenario) => scenarioMatchesFilters(scenario, filters));

  if (filtered.length === 0) {
    console.log('No scenarios matched the provided filters.');
    return;
  }

  const grouped = new Map();
  for (const scenario of filtered) {
    const category = scenario.category || 'general';
    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
    grouped.get(category).push(scenario);
  }

  console.log('Available demo scenarios (grouped by category):');
  for (const [category, categoryScenarios] of grouped.entries()) {
    console.log(`\n- ${category}`);
    for (const scenario of categoryScenarios) {
      const tagsText = scenario.tags.length ? ` | tags: ${scenario.tags.join(', ')}` : '';
      const prerequisitesText = scenario.prerequisites.length
        ? ` | prereq: ${scenario.prerequisites.join('; ')}`
        : '';
      console.log(
        `  - ${scenario.name} [audience=${scenario.audience}, viewport=${typeof scenario.viewport === 'string' ? scenario.viewport : 'custom'}]`,
      );
      if (scenario.description) {
        console.log(`    ${scenario.description}${tagsText}${prerequisitesText}`);
      }
    }
  }
}

/**
 * @param {ReturnType<typeof normalizeScenario>[]} scenarios
 * @param {string | null | undefined} scenarioName
 */
export function resolveScenarioByName(scenarios, scenarioName) {
  if (!scenarioName) {
    return null;
  }
  return scenarios.find((item) => item.name === scenarioName) || null;
}

/**
 * @param {ReturnType<typeof normalizeScenario>[]} scenarios
 */
export function formatAvailableNames(scenarios) {
  return scenarios.map((item) => item.name).join(', ');
}

/**
 * @param {string | null | undefined} scenarioName
 */
export async function loadScenario(scenarioName) {
  const { scenarios } = await loadManifest();
  if (!scenarioName) {
    const names = formatAvailableNames(scenarios);
    throw new Error(
      `No scenario specified. Provide one with: node dev/demo-gif.mjs <scenario>\nAvailable scenarios: ${names}`,
    );
  }

  const scenario = resolveScenarioByName(scenarios, scenarioName);
  if (!scenario) {
    const names = formatAvailableNames(scenarios);
    throw new Error(`Scenario "${scenarioName}" not found. Available scenarios: ${names}`);
  }

  if (!Array.isArray(scenario.steps)) {
    throw new Error(`Scenario "${scenarioName}" is missing a valid "steps" array.`);
  }

  return scenario;
}

/**
 * @param {string | number | Record<string, unknown> | undefined} viewport
 */
export function resolveViewportConfig(viewport) {
  if (!viewport) {
    return defaultViewportByProfile.desktop;
  }
  if (typeof viewport === 'string') {
    return defaultViewportByProfile[viewport] || defaultViewportByProfile.desktop;
  }
  if (
    typeof viewport === 'object' &&
    Number.isFinite(viewport.width) &&
    Number.isFinite(viewport.height)
  ) {
    return { width: viewport.width, height: viewport.height };
  }
  return defaultViewportByProfile.desktop;
}

