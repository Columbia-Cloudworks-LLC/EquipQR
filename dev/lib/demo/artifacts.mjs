import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const DEMO_DIR = 'tmp/demos';

/**
 * @param {Date} date
 * @returns {string}
 */
export function formatArtifactTimestamp(date = new Date()) {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

/**
 * @param {string} flow
 * @returns {string}
 */
export function sanitizeFlowToken(flow) {
  return (
    String(flow)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'demo'
  );
}

/**
 * @param {number | null | undefined} runIndex
 * @returns {string}
 */
export function formatRunSuffix(runIndex) {
  if (!Number.isInteger(runIndex) || runIndex <= 0) {
    return '';
  }
  return `-run${String(runIndex).padStart(2, '0')}`;
}

/**
 * @param {{ flow: string, runIndex?: number | null, timestamp?: string, extension?: string }} options
 * @returns {string}
 */
export function buildCanonicalArtifactFilename(options) {
  const timestamp = options.timestamp || formatArtifactTimestamp();
  const flow = sanitizeFlowToken(options.flow);
  const ext = options.extension || '.webm';
  const extension = ext.startsWith('.') ? ext : `.${ext}`;
  const runSuffix = formatRunSuffix(options.runIndex);
  return `${timestamp}-${flow}${runSuffix}${extension}`;
}

/**
 * @param {{ flow: string, runIndex?: number | null, timestamp?: string, extension?: string }} options
 * @returns {string}
 */
export function buildCanonicalArtifactRelativePath(options) {
  return `${DEMO_DIR}/${buildCanonicalArtifactFilename(options)}`;
}

/**
 * @param {string} relativePath
 * @returns {Promise<boolean>}
 */
async function relativePathExists(relativePath) {
  try {
    await fs.access(path.resolve(process.cwd(), relativePath));
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} relativePath
 * @returns {Promise<string>}
 */
export async function ensureUniqueRelativePath(relativePath) {
  if (!(await relativePathExists(relativePath))) {
    return relativePath;
  }

  const ext = path.extname(relativePath);
  const base = relativePath.slice(0, -ext.length);
  let attempt = 2;
  while (attempt <= 99) {
    const candidate = `${base}-dup${String(attempt).padStart(2, '0')}${ext}`;
    if (!(await relativePathExists(candidate))) {
      return candidate;
    }
    attempt += 1;
  }

  throw new Error(`Could not allocate unique demo artifact path for ${relativePath}`);
}

/**
 * @param {{ flow: string, runIndex?: number | null, extension?: string, timestamp?: string }} options
 * @returns {Promise<string>}
 */
export async function allocateCanonicalArtifactRelativePath(options) {
  const base = buildCanonicalArtifactRelativePath(options);
  return ensureUniqueRelativePath(base);
}

/**
 * @returns {Promise<void>}
 */
export async function ensureDemoDirectory() {
  await fs.mkdir(path.resolve(process.cwd(), DEMO_DIR), { recursive: true });
}

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
    'DEMO_V2_BACKOFF_MS',
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
 *  activity: { actionCount: number, spotlightCount?: number, retryCount: number, selectorFallbackCount: number, checkpointPassCount: number, checkpointFailCount: number },
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
    finishedAt: input.finishedAtIso,
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
 *  spotlightCount?: number,
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
    spotlightCount: Number(input.spotlightCount || 0),
    qualityGate: input.qualityGate,
    env: buildSafeEnvSnapshot(input.env),
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

/**
 * @param {{
 *  scenarioMinDurationMs: number,
 *  totalDurationMs: number,
 *  activityCount: number,
 *  spotlightCount?: number,
 *  videoSize?: { width: number, height: number },
 *  requiredCheckpointCount: number,
 *  passedCheckpointCount: number
 * }} input
 */
export function evaluateDemoQualityGate(input) {
  /** @type {Array<{ code: string, message: string }>} */
  const failures = [];

  if (input.totalDurationMs < input.scenarioMinDurationMs) {
    failures.push({
      code: 'MIN_DURATION_NOT_MET',
      message: `Run duration ${input.totalDurationMs}ms is below minimum ${input.scenarioMinDurationMs}ms.`,
    });
  }

  if (input.activityCount < 2) {
    failures.push({
      code: 'LOW_ACTIVITY',
      message: `Run has low activity (${input.activityCount} meaningful actions).`,
    });
  }

  if (input.videoSize) {
    const width = Number(input.videoSize.width);
    const height = Number(input.videoSize.height);
    const ratio = width / height;
    const isSixteenNine = Number.isFinite(ratio) && Math.abs(ratio - 16 / 9) < 0.01;
    if (!isSixteenNine || width < 1920 || height < 1080) {
      failures.push({
        code: 'VIDEO_SIZE_NOT_DETAILED_16_9',
        message: `Desktop demo video must be at least 1920x1080 16:9 (got ${width}x${height}).`,
      });
    }
  }

  if (input.activityCount >= 2 && typeof input.spotlightCount === 'number') {
    const requiredSpotlights = Math.max(1, Math.ceil(input.activityCount * 0.3));
    if (input.spotlightCount < requiredSpotlights) {
      failures.push({
        code: 'LOW_SPOTLIGHT_COVERAGE',
        message: `Only ${input.spotlightCount}/${input.activityCount} actions had visible target spotlights.`,
      });
    }
  }

  if (input.requiredCheckpointCount > input.passedCheckpointCount) {
    failures.push({
      code: 'CHECKPOINTS_MISSING',
      message: `Only ${input.passedCheckpointCount}/${input.requiredCheckpointCount} required checkpoints passed.`,
    });
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

/**
 * @param {string} command
 * @param {string[]} args
 * @param {string} cwd
 */
async function runProcess(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    child.on('error', reject);
    child.on('close', (code) =>
      resolve({ code: typeof code === 'number' ? code : 1, stdout, stderr }),
    );
  });
}

/**
 * @param {string} command
 */
async function binaryAvailable(command) {
  try {
    const result =
      process.platform === 'win32'
        ? await runProcess('where', [command], process.cwd())
        : await runProcess('which', [command], process.cwd());
    return result.code === 0;
  } catch {
    return false;
  }
}

/**
 * @param {string} value
 */
function escapeDrawtextValue(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * @param {{
 *  repoRoot: string,
 *  sceneClipRelativePaths: string[],
 *  outputRelativePath: string,
 *  introText?: string,
 *  outroText?: string
 * }} opts
 */
export async function composeSceneClips(opts) {
  const hasFfmpeg = await binaryAvailable('ffmpeg');
  if (!hasFfmpeg) {
    return {
      composed: false,
      skippedReason: 'ffmpeg-unavailable',
    };
  }

  if (!opts.sceneClipRelativePaths.length) {
    return {
      composed: false,
      skippedReason: 'no-scene-clips',
    };
  }

  const absoluteOutput = path.resolve(opts.repoRoot, opts.outputRelativePath);
  const absoluteSceneClips = opts.sceneClipRelativePaths.map((clip) =>
    path.resolve(opts.repoRoot, clip).replace(/\\/g, '/'),
  );
  const runToken = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

  const introText = opts.introText || 'EquipQR Demo';
  const outroText = opts.outroText || 'End of Demo';
  const introFilter = `drawtext=text='${escapeDrawtextValue(introText)}':x=(w-text_w)/2:y=(h-text_h)/2:fontsize=36:fontcolor=white`;
  const outroFilter = `drawtext=text='${escapeDrawtextValue(outroText)}':x=(w-text_w)/2:y=(h-text_h)/2:fontsize=36:fontcolor=white`;

  const introPath = path.resolve(opts.repoRoot, 'tmp', 'demos', `compose-intro-${runToken}.webm`);
  const outroPath = path.resolve(opts.repoRoot, 'tmp', 'demos', `compose-outro-${runToken}.webm`);
  const introResult = await runProcess(
    'ffmpeg',
    [
      '-y',
      '-f',
      'lavfi',
      '-i',
      'color=c=black:s=1920x1080:d=1.5',
      '-vf',
      introFilter,
      '-c:v',
      'libvpx-vp9',
      '-pix_fmt',
      'yuv420p',
      '-an',
      introPath,
    ],
    opts.repoRoot,
  );
  if (introResult.code !== 0) {
    return { composed: false, skippedReason: 'intro-render-failed' };
  }

  const outroResult = await runProcess(
    'ffmpeg',
    [
      '-y',
      '-f',
      'lavfi',
      '-i',
      'color=c=black:s=1920x1080:d=1.5',
      '-vf',
      outroFilter,
      '-c:v',
      'libvpx-vp9',
      '-pix_fmt',
      'yuv420p',
      '-an',
      outroPath,
    ],
    opts.repoRoot,
  );
  if (outroResult.code !== 0) {
    return { composed: false, skippedReason: 'outro-render-failed' };
  }

  const mergedListPath = path.resolve(
    opts.repoRoot,
    'tmp',
    'demos',
    `compose-merged-input-${runToken}.txt`,
  );
  const mergedLines = [
    `file '${introPath.replace(/\\/g, '/')}'`,
    ...absoluteSceneClips.map((absoluteClip) => `file '${absoluteClip}'`),
    `file '${outroPath.replace(/\\/g, '/')}'`,
  ].join('\n');
  await fs.writeFile(mergedListPath, `${mergedLines}\n`, 'utf8');

  const concatResult = await runProcess(
    'ffmpeg',
    [
      '-y',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      mergedListPath,
      '-c:v',
      'libvpx-vp9',
      '-pix_fmt',
      'yuv420p',
      '-an',
      absoluteOutput,
    ],
    opts.repoRoot,
  );

  if (concatResult.code !== 0) {
    return { composed: false, skippedReason: 'concat-failed' };
  }

  return {
    composed: true,
    skippedReason: null,
    outputRelativePath: opts.outputRelativePath,
  };
}

/**
 * @param {{ enabledFromFlag: boolean, composeFlag: boolean | null }} opts
 */
export function resolveComposeEnabled(opts) {
  if (opts.composeFlag === true) return true;
  if (opts.composeFlag === false) return false;
  return opts.enabledFromFlag;
}
