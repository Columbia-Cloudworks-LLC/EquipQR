import { spawn } from 'child_process';
import { createDemoStepActions } from './demoStepActions.mjs';
import { RECORDING_VIEWPORT } from './recording-quality.mjs';

/**
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {string} baseUrl
 * @param {string} route
 */
function buildRouteUrl(baseUrl, route) {
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  if (!route.startsWith('/')) {
    return `${normalizedBase}/${route}`;
  }
  return `${normalizedBase}${route}`;
}

/**
 * @param {string} command
 * @param {string[]} [args]
 */
async function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      process.stdout.write(text);
    });
    child.stderr.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      process.stderr.write(text);
    });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code: typeof code === 'number' ? code : 1, stdout, stderr }));
  });
}

/**
 * @param {string[]} args
 */
async function runPlaywright(args) {
  const result = await runCommand('playwright-cli', args);
  const output = `${result.stdout}\n${result.stderr}`;
  if (result.code !== 0 || /^### Error/m.test(output) || /Error:\s+/m.test(output)) {
    throw new Error(`Playwright command failed: playwright-cli ${args.join(' ')}`);
  }
  return output;
}

/**
 * @param {string} script
 */
function runPlaywrightEval(script) {
  return runPlaywright(['eval', script]);
}

/**
 * @param {string} output
 * @param {string} marker
 */
function markerSeen(output, marker) {
  return output.includes(marker);
}

const DESKTOP_DEMO_VIEWPORT = RECORDING_VIEWPORT;
const DEMO_POST_ACTION_PAUSE_MS = 450;

/**
 * @param {{
 *   baseUrl: string,
 *   maxRetries?: number,
 *   backoffMs?: number,
 *   diagnostics: {
 *     retries: Array<Record<string, unknown>>,
 *     selectorFallbacks: Array<Record<string, unknown>>,
 *     sceneEvents: Array<Record<string, unknown>>
 *   }
 * }} opts
 */
export function createDemoStepRunner(opts) {
  const maxRetries = Number.isFinite(opts.maxRetries) ? Number(opts.maxRetries) : 2;
  const backoffMs = Number.isFinite(opts.backoffMs) ? Number(opts.backoffMs) : 350;

  /**
   * @param {string} sceneId
   * @param {number} stepIndex
   * @param {string} action
   */
  function recordSpotlight(sceneId, stepIndex, action) {
    opts.diagnostics.spotlightCount = Number(opts.diagnostics.spotlightCount || 0) + 1;
    opts.diagnostics.sceneEvents.push({
      type: 'spotlight-shown',
      sceneId,
      stepIndex,
      action,
    });
  }

  /**
   * @param {string} sceneId
   * @param {number} stepIndex
   * @param {Record<string, unknown>} step
   * @param {() => Promise<void>} fn
   */
  async function withRetries(sceneId, stepIndex, step, fn) {
    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        await fn();
        return;
      } catch (error) {
        if (attempt >= maxRetries) {
          throw error;
        }
        const waitMs = Math.min(2000, backoffMs * Math.pow(2, attempt));
        opts.diagnostics.retries.push({
          sceneId,
          stepIndex,
          action: step.action,
          attempt: attempt + 1,
          waitMs,
        });
        await sleep(waitMs);
        attempt += 1;
      }
    }
  }

  const { runAction, verifyCheckpoint } = createDemoStepActions({
    baseUrl: opts.baseUrl,
    diagnostics: opts.diagnostics,
    withRetries,
    recordSpotlight,
    runPlaywright,
    runPlaywrightEval,
    sleep,
    buildRouteUrl,
    markerSeen,
  });

  return {
    async openSession() {
      await runPlaywright(['open', 'about:blank']);
      await runPlaywright([
        'resize',
        String(DESKTOP_DEMO_VIEWPORT.width),
        String(DESKTOP_DEMO_VIEWPORT.height),
      ]);
      await runPlaywright(['video-start']);
    },
    async stopVideo(videoRelativePath) {
      const normalized = videoRelativePath.replaceAll('\\', '/');
      await runPlaywright(['video-stop', '--filename', normalized]).catch(async () => {
        await runPlaywright(['video-stop', normalized]);
      });
    },
    async closeSession() {
      await runPlaywright(['close']).catch(() => undefined);
    },
    async runScene(scene, actionCountRef) {
      const startedAtMs = Date.now();
      for (let index = 0; index < scene.steps.length; index += 1) {
        const step = scene.steps[index];
        if (step.type !== 'action') {
          throw new Error(`Expanded step must be action; received "${step.type}".`);
        }
        const actionCountBefore = actionCountRef.value;
        await runAction(step, { sceneId: scene.id, stepIndex: index, actionCountRef });
        if (actionCountRef.value > actionCountBefore && step.action !== 'waitForNetworkIdle') {
          await sleep(DEMO_POST_ACTION_PAUSE_MS);
        }
      }

      let passedCheckpoints = 0;
      for (const checkpoint of scene.requiredCheckpoints || []) {
        try {
          await verifyCheckpoint(checkpoint);
          passedCheckpoints += 1;
        } catch (error) {
          opts.diagnostics.sceneEvents.push({
            type: 'checkpoint-failed',
            sceneId: scene.id,
            checkpointId: checkpoint.id,
            message: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      }

      return {
        sceneId: scene.id,
        title: scene.title,
        startedAtMs,
        finishedAtMs: Date.now(),
        durationMs: Date.now() - startedAtMs,
        requiredCheckpointCount: (scene.requiredCheckpoints || []).length,
        passedCheckpointCount: passedCheckpoints,
      };
    },
  };
}
