import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  runPlaywrightCommand,
  sleep,
} from './demoGifPlaywright.mjs';
import { escapeForSingleQuotedJsString } from './demoGifAuth.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scenariosPath = path.join(__dirname, '..', 'demo-scenarios.json');

export const defaultViewportByProfile = {
  desktop: { width: 1920, height: 1080 },
  mobile: { width: 390, height: 844 },
};

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
      `No scenario specified. Provide one with: node scripts/demo-gif.mjs <scenario>\nAvailable scenarios: ${names}`,
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
  if (typeof viewport === 'object' && Number.isFinite(viewport.width) && Number.isFinite(viewport.height)) {
    return { width: viewport.width, height: viewport.height };
  }
  return defaultViewportByProfile.desktop;
}

/**
 * @param {string | number | Record<string, unknown> | undefined} step
 */
function formatStepForError(step) {
  if (typeof step === 'string') {
    return step;
  }
  if (step && typeof step === 'object') {
    if (step.type === 'playwright') {
      return step.command || JSON.stringify(step);
    }
    if (step.type === 'action') {
      return `action:${step.action}`;
    }
    return JSON.stringify(step);
  }
  return String(step);
}

async function runDemoActionFromString(rawAction) {
  const [, actionBody] = rawAction.split(':');
  const [actionName, ...rest] = actionBody.trim().split(/\s+/);
  const value = rest.join(' ').trim();

  switch (actionName) {
    case 'pause': {
      const ms = Number.parseInt(value, 10);
      if (!Number.isFinite(ms)) {
        throw new Error(`Invalid pause duration in step "${rawAction}".`);
      }
      await sleep(ms);
      return;
    }
    case 'snapshot':
      await runPlaywrightCommand('playwright-cli snapshot');
      return;
    case 'scrollToBottom':
      await runPlaywrightCommand(
        `playwright-cli eval "() => { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); }"`,
      );
      return;
    default:
      throw new Error(`Unknown demo action "${actionName}" in step "${rawAction}".`);
  }
}

/**
 * @param {Record<string, unknown>} step
 */
async function runDemoAction(step) {
  const action = step.action;
  switch (action) {
    case 'pause': {
      const ms = Number.parseInt(String(step.ms ?? 1000), 10);
      await sleep(ms);
      return;
    }
    case 'snapshot':
      await runPlaywrightCommand('playwright-cli snapshot');
      return;
    case 'scroll': {
      const pixels = Number.parseInt(String(step.pixels ?? 500), 10);
      await runPlaywrightCommand(
        `playwright-cli eval "() => { window.scrollBy({ top: ${pixels}, behavior: 'smooth' }); }"`,
      );
      return;
    }
    case 'scrollToBottom':
      await runPlaywrightCommand(
        `playwright-cli eval "() => { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); }"`,
      );
      return;
    case 'clickByText': {
      const text = String(step.text || '').trim();
      const selector = String(step.selector || 'button,[role=button],a,[role=tab]');
      if (!text) throw new Error('clickByText requires "text".');
      const selectorEscaped = escapeForSingleQuotedJsString(selector);
      const textEscaped = escapeForSingleQuotedJsString(text);
      await runPlaywrightCommand(
        `playwright-cli eval "() => { const el = Array.from(document.querySelectorAll('${selectorEscaped}')).find(node => new RegExp('${textEscaped}', 'i').test(node.textContent || '')); if (!el) throw new Error('Element not found by text: ${textEscaped}'); el.click(); }"`,
      );
      return;
    }
    case 'clickSelector': {
      const selector = String(step.selector || '').trim();
      if (!selector) throw new Error('clickSelector requires "selector".');
      const selectorEscaped = escapeForSingleQuotedJsString(selector);
      await runPlaywrightCommand(
        `playwright-cli eval "() => { const el = document.querySelector('${selectorEscaped}'); if (!el) throw new Error('Element not found for selector: ${selectorEscaped}'); el.click(); }"`,
      );
      return;
    }
    case 'fill': {
      const selector = String(step.selector || '').trim();
      const value = String(step.value ?? '');
      if (!selector) throw new Error('fill requires "selector".');
      const selectorEscaped = escapeForSingleQuotedJsString(selector);
      const valueEscaped = escapeForSingleQuotedJsString(value);
      await runPlaywrightCommand(
        `playwright-cli eval "() => { const el = document.querySelector('${selectorEscaped}'); if (!el) throw new Error('Input not found for selector: ${selectorEscaped}'); el.focus(); el.value = '${valueEscaped}'; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }"`,
      );
      return;
    }
    case 'openFirst': {
      const selector = String(step.selector || 'a[href*=/dashboard/equipment/], tr[role=button], [aria-label*="Open "]');
      const selectorEscaped = escapeForSingleQuotedJsString(selector);
      await runPlaywrightCommand(
        `playwright-cli eval "() => { const el = document.querySelector('${selectorEscaped}'); if (!el) throw new Error('No element found for openFirst selector'); el.click(); }"`,
      );
      return;
    }
    case 'copyQrAndNavigate': {
      const pattern = String(step.pattern || '/qr/');
      const patternEscaped = escapeForSingleQuotedJsString(pattern);
      await runPlaywrightCommand(
        `playwright-cli eval "() => { const text = Array.from(document.querySelectorAll('div,span,p,code')).map(el => (el.textContent || '').trim()).find(t => t.includes('${patternEscaped}') && /^https?:\\/\\//i.test(t)); if (!text) throw new Error('QR URL not found in current view'); window.location.href = text; }"`,
      );
      return;
    }
    default:
      throw new Error(`Unsupported action step "${action}".`);
  }
}

/**
 * @param {string | number | Record<string, unknown>} step
 * @param {ReturnType<typeof normalizeScenario>} scenario
 * @param {number} index
 */
async function runScenarioStep(step, scenario, index) {
  if (typeof step === 'string') {
    const command = step.trim();
    if (!command) {
      throw new Error(`Empty step at index ${index}.`);
    }
    if (command.startsWith('playwright-cli ')) {
      await runPlaywrightCommand(command);
      return;
    }
    if (command.startsWith('demo:')) {
      await runDemoActionFromString(command);
      return;
    }
    throw new Error(`Unsupported step string "${command}".`);
  }

  if (!step || typeof step !== 'object') {
    throw new Error(`Invalid step format at index ${index}.`);
  }

  if (step.type === 'playwright') {
    if (!step.command || typeof step.command !== 'string') {
      throw new Error('playwright step requires a "command" string.');
    }
    await runPlaywrightCommand(step.command);
    return;
  }

  if (step.type === 'action') {
    await runDemoAction(step);
    return;
  }

  throw new Error(`Unknown step type "${step.type}" in scenario "${scenario.name}".`);
}

/**
 * @param {ReturnType<typeof normalizeScenario>} scenario
 */
export async function runScenarioSteps(scenario) {
  for (let index = 0; index < scenario.steps.length; index += 1) {
    const step = scenario.steps[index];

    try {
      await runScenarioStep(step, scenario, index);
    } catch (error) {
      throw new Error(
        `Scenario "${scenario.name}" failed at step ${index + 1}: ${formatStepForError(step)}\n${error.message}`,
      );
    }
  }
}
