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
  const name = toText(args?.name);
  if (name) {
    return [
      {
        type: 'action',
        action: 'clickByLabel',
        label: `Open details for ${name}`
      },
      {
        type: 'action',
        action: 'pauseReadable',
        ms: 1000
      }
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

/**
 * Drives the "Add Equipment" wizard end-to-end. The form is reachable from any
 * /dashboard/equipment page via the "Add Equipment" button.
 *
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
    { type: 'action', action: 'fillRole', name: 'Location Description', value: location }
  ]);

  if (description) {
    steps.push({
      type: 'action',
      action: 'fillRole',
      name: 'Description',
      value: description,
      fallbackSelectors: ['textarea[placeholder*="Additional information" i]', 'textarea']
    });
  }

  if (status && status.toLowerCase() !== 'active') {
    steps.push({
      type: 'action',
      action: 'selectOption',
      selector: '[id$="status"],select[name="status"]',
      value: status.toLowerCase()
    });
  }

  steps.push(
    { type: 'action', action: 'clickRole', role: 'button', name: 'Create Equipment' },
    { type: 'action', action: 'pauseReadable', ms: 1500 }
  );

  return steps;
}

/**
 * Adds (or extends) a single Custom Attribute row on the equipment detail page.
 * Set `andSave: false` to chain multiple `addCustomAttribute` calls without
 * persisting between rows; the final call should `andSave: true`.
 *
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
      parentSelector: '[data-section="custom-attributes"],section,article,div'
    },
    { type: 'action', action: 'pauseReadable', ms: 400 },
    { type: 'action', action: 'clickRole', role: 'button', name: 'Add Attribute' },
    { type: 'action', action: 'pauseReadable', ms: 300 },
    {
      type: 'action',
      action: 'fillRole',
      name: 'Attribute Name',
      value: name,
      fallbackSelectors: ['input[placeholder="Attribute name"]']
    },
    {
      type: 'action',
      action: 'fillRole',
      name: 'Attribute Value',
      value: value,
      fallbackSelectors: ['input[placeholder="Attribute value"]']
    },
    ...(andSave
      ? /** @type {DemoActionStep[]} */ ([
          { type: 'action', action: 'clickRole', role: 'button', name: 'Save' },
          { type: 'action', action: 'pauseReadable', ms: 900 }
        ])
      : /** @type {DemoActionStep[]} */ ([])
    )
  ];
}

/**
 * Adds a note on the Equipment Notes tab. Optionally records a Machine Hours
 * reading so the v2.10.0 machine-hours feature appears in the captured demo.
 *
 * @param {Record<string, unknown> | undefined} args
 * @returns {DemoActionStep[]}
 */
function addEquipmentNoteMacro(args) {
  const content = toText(args?.content) || 'Note added during demo recording.';
  const hoursWorked = Number.isFinite(Number(args?.hoursWorked)) ? String(args?.hoursWorked) : '';
  const machineHours = Number.isFinite(Number(args?.machineHours)) ? String(args?.machineHours) : '';

  const steps = /** @type {DemoActionStep[]} */ ([
    {
      type: 'action',
      action: 'fillRole',
      name: 'Note content',
      value: content,
      fallbackSelectors: ['textarea[placeholder*="Enter your note" i]', 'textarea']
    }
  ]);

  if (hoursWorked) {
    steps.push({
      type: 'action',
      action: 'fillNumberInput',
      name: 'Hours Worked',
      value: hoursWorked
    });
  }

  if (machineHours) {
    steps.push({
      type: 'action',
      action: 'fillNumberInput',
      name: 'Machine Hours',
      value: machineHours
    });
  }

  steps.push(
    { type: 'action', action: 'clickRole', role: 'button', name: 'Add Note' },
    { type: 'action', action: 'pauseReadable', ms: 1200 }
  );

  return steps;
}

/**
 * Creates a new team from the /dashboard/teams page.
 *
 * @param {Record<string, unknown> | undefined} args
 * @returns {DemoActionStep[]}
 */
function createTeamMacro(args) {
  const name = toText(args?.name) || 'Demo Team';
  const description = toText(args?.description) || '';

  const steps = /** @type {DemoActionStep[]} */ ([
    { type: 'action', action: 'clickRole', role: 'button', name: 'Create Team' },
    { type: 'action', action: 'pauseReadable', ms: 600 },
    { type: 'action', action: 'fillRole', name: 'Team Name', value: name }
  ]);

  if (description) {
    steps.push({ type: 'action', action: 'fillRole', name: 'Description', value: description });
  }

  steps.push(
    { type: 'action', action: 'clickRole', role: 'button', name: 'Create' },
    { type: 'action', action: 'pauseReadable', ms: 1200 }
  );

  return steps;
}

/**
 * Adds a member to the team currently being viewed.
 *
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
        'input[type="text"]'
      ],
      required: false
    },
    { type: 'action', action: 'pauseReadable', ms: 600 },
    {
      type: 'action',
      action: 'clickText',
      text: member,
      selector: '[role="option"],li,button',
      required: false
    },
    { type: 'action', action: 'clickRole', role: 'button', name: 'Add', required: false },
    { type: 'action', action: 'pauseReadable', ms: 900 }
  ];
}

/**
 * Assigns a team to the equipment currently in view (Details tab).
 *
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
      required: false
    },
    { type: 'action', action: 'clickRole', role: 'button', name: 'Save', required: false },
    { type: 'action', action: 'pauseReadable', ms: 900 }
  ];
}

/**
 * Sets the default PM template on the equipment currently in view.
 *
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
      required: false
    },
    { type: 'action', action: 'clickRole', role: 'button', name: 'Save', required: false },
    { type: 'action', action: 'pauseReadable', ms: 900 }
  ];
}

/**
 * Opens the New Work Order dialog and creates a PM work order with a fresh
 * machine hours reading captured at intake.
 *
 * @param {Record<string, unknown> | undefined} args
 * @returns {DemoActionStep[]}
 */
function createPmWorkOrderMacro(args) {
  const title = toText(args?.title) || 'PM work order';
  const templateName = toText(args?.templateName) || '';
  const machineHours = Number.isFinite(Number(args?.machineHours)) ? String(args?.machineHours) : '';

  const steps = /** @type {DemoActionStep[]} */ ([
    { type: 'action', action: 'clickRole', role: 'button', name: 'Work Order' },
    { type: 'action', action: 'pauseReadable', ms: 700 },
    {
      type: 'action',
      action: 'clickText',
      text: 'Preventative Maintenance|PM',
      regex: true,
      selector: '[role="option"],button,label',
      required: false
    },
    { type: 'action', action: 'fillRole', name: 'Title', value: title }
  ]);

  if (templateName) {
    steps.push(
      { type: 'action', action: 'clickByLabel', label: 'Select PM template', required: false },
      {
        type: 'action',
        action: 'clickText',
        text: templateName,
        selector: '[role="option"],li,button',
        required: false
      }
    );
  }

  if (machineHours) {
    steps.push({
      type: 'action',
      action: 'fillNumberInput',
      name: 'Machine Hours',
      value: machineHours
    });
  }

  steps.push(
    { type: 'action', action: 'clickRole', role: 'button', name: 'Create Work Order' },
    { type: 'action', action: 'pauseReadable', ms: 1500 }
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
  createPmWorkOrder: createPmWorkOrderMacro
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
