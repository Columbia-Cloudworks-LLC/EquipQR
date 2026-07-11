/**
 * Parse argv for scripts/run-vitest-local.mjs (testable without spawning Vitest).
 */

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
    if (arg.startsWith('--reporter')) {
      continue;
    }
    if (arg === '--project') {
      projectFilter = rawArgs[i + 1] ?? null;
      i += 1;
      continue;
    }
    if (arg.startsWith('--project=')) {
      projectFilter = arg.slice('--project='.length) || null;
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
