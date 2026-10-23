/**
 * Parse argv for dev/test-runner.mjs and dev/run-vitest-local.mjs (testable without spawning Vitest).
 */

/**
 * @param {string[]} rawArgs
 * @returns {{
 *   mode: 'local' | 'ci' | 'shard' | 'sharded';
 *   shard?: string;
 *   shardIndex?: number;
 *   shardTotal?: number;
 *   localArgs: string[];
 * }}
 */
export function parseTestRunnerArgs(rawArgs) {
  const shardArg = rawArgs.find((a) => a.startsWith('--shard='));
  if (shardArg) {
    const value = shardArg.slice('--shard='.length);
    const [indexStr, totalStr] = value.split('/');
    const shardIndex = Number.parseInt(indexStr, 10);
    const shardTotal = Number.parseInt(totalStr, 10);
    if (!Number.isFinite(shardIndex) || !Number.isFinite(shardTotal) || shardIndex < 1 || shardTotal < 1 || shardIndex > shardTotal) {
      throw new Error(`Invalid --shard=${value} argument (expected N/M)`);
    }
    return {
      mode: 'shard',
      shard: shardArg,
      shardIndex,
      shardTotal,
      localArgs: [],
    };
  }

  const shardsArg = rawArgs.find((a) => a.startsWith('--shards='));
  if (shardsArg) {
    const shardTotal = Number.parseInt(shardsArg.slice('--shards='.length), 10);
    if (!Number.isFinite(shardTotal) || shardTotal < 1) {
      throw new Error('Invalid --shards=N value');
    }
    return {
      mode: 'sharded',
      shardTotal,
      localArgs: [],
    };
  }

  if (rawArgs.includes('--ci')) {
    return {
      mode: 'ci',
      localArgs: rawArgs.filter((a) => a !== '--ci'),
    };
  }

  return {
    mode: 'local',
    localArgs: rawArgs.filter((a) => a !== '--local'),
  };
}

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
