/**
 * Parse argv for scripts/run-vitest-local.mjs (testable without spawning Vitest).
 */

/**
 * @param {string[]} rawArgs
 * @returns {string[]}
 */
export function parseReporterArgs(rawArgs) {
  for (let i = 0; i < rawArgs.length; i += 1) {
    const arg = rawArgs[i];
    if (arg === '--reporter') {
      const value = rawArgs[i + 1];
      if (value == null || value.startsWith('-')) {
        throw new Error('--reporter requires a value');
      }
      return ['--reporter', value];
    }
    if (arg.startsWith('--reporter=')) {
      return [arg];
    }
  }
  return ['--reporter=default'];
}

/**
 * @param {string[]} rawArgs process.argv.slice(2)
 * @returns {{ projectFilter: string | null; passthroughArgs: string[] }}
 */
export function parseVitestLocalArgs(rawArgs) {
  let projectFilter = null;
  /** @type {string[]} */
  const passthroughArgs = [];

  for (let i = 0; i < rawArgs.length; i += 1) {
    const arg = rawArgs[i];
    if (arg === '--reporter') {
      if (rawArgs[i + 1] == null || rawArgs[i + 1].startsWith('-')) {
        throw new Error('--reporter requires a value');
      }
      i += 1;
      continue;
    }
    if (arg.startsWith('--reporter=')) {
      continue;
    }
    if (arg === '--project') {
      const value = rawArgs[i + 1];
      if (value == null || value.startsWith('-')) {
        throw new Error('--project requires unit or component');
      }
      projectFilter = value;
      i += 1;
      continue;
    }
    if (arg.startsWith('--project=')) {
      const value = arg.slice('--project='.length);
      if (!value) {
        throw new Error('--project requires unit or component');
      }
      projectFilter = value;
      continue;
    }
    passthroughArgs.push(arg);
  }

  return { projectFilter, passthroughArgs };
}

/**
 * Positional path/test filters only — excludes bare option values.
 *
 * @param {string[]} passthroughArgs
 * @returns {string[]}
 */
export function getVitestPathFilters(passthroughArgs) {
  return passthroughArgs.filter(
    (a) =>
      !a.startsWith('-') &&
      (a.includes('/') || /\.(test|spec)\.[cm]?[jt]sx?$/i.test(a)),
  );
}
