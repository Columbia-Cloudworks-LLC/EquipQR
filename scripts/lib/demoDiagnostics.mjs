import fs from 'fs/promises';
import path from 'path';

/**
 * @param {NodeJS.ProcessEnv} env
 */
function buildSafeEnvSnapshot(env) {
  const allowList = [
    'DEMO_BASE_URL',
    'DEMO_STORAGE_STATE',
    'DEMO_COMPOSE_SCENES',
    'DEMO_CAPTURE_SCENE_CLIPS',
    'DEMO_RUN_INDEX',
    'DEMO_V2_MAX_RETRIES',
    'DEMO_V2_BACKOFF_MS'
  ];

  /** @type {Record<string, string>} */
  const snapshot = {};
  for (const key of allowList) {
    const raw = env[key];
    if (!raw) continue;
    if (key === 'DEMO_STORAGE_STATE') {
      snapshot[key] = '<redacted-path>';
      continue;
    }
    snapshot[key] = raw;
  }
  return snapshot;
}

/**
 * @param {string} videoRelativePath
 */
export function buildMetadataPath(videoRelativePath) {
  return videoRelativePath.replace(/\.webm$/i, '.metadata.json');
}

/**
 * @param {string} videoRelativePath
 */
export function buildDiagnosticsPath(videoRelativePath) {
  return videoRelativePath.replace(/\.webm$/i, '.diagnostics.json');
}

/**
 * @param {string} videoRelativePath
 * @param {string} sceneId
 */
export function buildSceneClipPath(videoRelativePath, sceneId) {
  return videoRelativePath.replace(/\.webm$/i, `.scene-${sceneId}.webm`);
}

/**
 * @param {{
 *  command: string,
 *  baseUrl: string,
 *  scenarioId: string,
 *  scenarioTitle: string,
 *  flowToken: string,
 *  runIndex: number | null,
 *  videoRelativePath: string,
 *  status: 'passed' | 'failed',
 *  reason?: string | null,
 *  startedAtIso: string,
 *  finishedAtIso: string,
 *  sceneTimings: Array<Record<string, unknown>>,
 *  activity: { actionCount: number, retryCount: number, selectorFallbackCount: number, checkpointPassCount: number, checkpointFailCount: number },
 *  qualityGate: Record<string, unknown>,
 *  compose: { enabled: boolean, attempted: boolean, composed: boolean, skippedReason?: string },
 *  env: NodeJS.ProcessEnv
 * }} input
 */
export function buildRunMetadata(input) {
  return {
    scenarioId: input.scenarioId,
    scenarioName: input.scenarioTitle,
    flowToken: input.flowToken,
    baseUrl: input.baseUrl,
    timestamp: input.startedAtIso,
    runIndex: input.runIndex,
    status: input.status,
    failureReason: input.reason || null,
    command: input.command,
    videoPath: input.videoRelativePath,
    sceneTimingSummary: input.sceneTimings,
    qualityGate: input.qualityGate,
    activity: input.activity,
    compose: input.compose,
    startedAt: input.startedAtIso,
    finishedAt: input.finishedAtIso
  };
}

/**
 * @param {{
 *  command: string,
 *  scenarioId: string,
 *  flowToken: string,
 *  runIndex: number | null,
 *  failureTaxonomy: string[],
 *  selectorFallbacks: Array<Record<string, unknown>>,
 *  retries: Array<Record<string, unknown>>,
 *  sceneEvents: Array<Record<string, unknown>>,
 *  qualityGate: Record<string, unknown>,
 *  env: NodeJS.ProcessEnv
 * }} input
 */
export function buildDiagnostics(input) {
  return {
    command: input.command,
    scenarioId: input.scenarioId,
    flowToken: input.flowToken,
    runIndex: input.runIndex,
    failureTaxonomy: input.failureTaxonomy,
    selectorFallbacks: input.selectorFallbacks,
    retries: input.retries,
    sceneEvents: input.sceneEvents,
    qualityGate: input.qualityGate,
    env: buildSafeEnvSnapshot(input.env)
  };
}

/**
 * @param {string} rootDir
 * @param {string} relativePath
 * @param {unknown} payload
 */
export async function writeJsonArtifact(rootDir, relativePath, payload) {
  const absolute = path.resolve(rootDir, relativePath);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return absolute;
}
