/**
 * Parse argv for scripts/run-vitest-local.mjs (testable without spawning Vitest).
 */

/**
 * @param {string[]} rawArgs process.argv.slice(2)
 * @returns {{ projectFilter: string | null; passthroughArgs: string[] }}
 */
export function parseVitestLocalArgs(rawArgs) {
  const projectIndex = rawArgs.indexOf('--project');
  const projectFilter = projectIndex >= 0 ? rawArgs[projectIndex + 1] ?? null : null;

  const passthroughArgs = rawArgs.filter((a, i) => {
    if (a.startsWith('--reporter')) return false;
    if (a === '--project') return false;
    if (projectIndex >= 0 && i === projectIndex + 1) return false;
    return true;
  });

  return { projectFilter, passthroughArgs };
}
