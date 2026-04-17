/**
 * @typedef {{ type: 'action', action: string, [key: string]: unknown }} DemoActionStep
 * @typedef {{ type: 'macro', name: string, args?: Record<string, unknown> }} DemoMacroStep
 */

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
      required: false
    },
    {
      type: 'action',
      action: 'pauseReadable',
      ms: 700
    }
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
      required: false
    },
    {
      type: 'action',
      action: 'fillRole',
      name: 'Search',
      value,
      fallbackSelectors: [
        'input[type="search"]',
        'input[placeholder*="search" i]',
        'input[name*="search" i]'
      ],
      required: false
    },
    {
      type: 'action',
      action: 'pauseReadable',
      ms: 900
    }
  ];
}

/**
 * @param {Record<string, unknown> | undefined} args
 * @returns {DemoActionStep[]}
 */
function openDetailsMacro(args) {
  const kind = toText(args?.kind) || 'record';
  return [
    {
      type: 'action',
      action: 'clickText',
      text: kind.includes('work') ? 'Work Orders|Open' : 'Open|Details|Equipment',
      regex: true,
      selector: 'a,button,[role="button"],tr[role="button"]',
      required: false
    },
    {
      type: 'action',
      action: 'pauseReadable',
      ms: 1000
    }
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
      route: '/dashboard'
    },
    {
      type: 'action',
      action: 'pauseReadable',
      ms: 900
    }
  ];
}

const macroImplementations = {
  openNav: openNavMacro,
  filterList: filterListMacro,
  openDetails: openDetailsMacro,
  returnDashboard: returnDashboardMacro
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
    sourceMacroStepIndex: index
  }));
}
