import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import {
  allocateCanonicalArtifactRelativePath,
  ensureDemoDirectory
} from './lib/demoArtifactPaths.mjs';
import {
  loadScenarioRegistry,
  listScenarioSummaries,
  expandScenarioSteps
} from './lib/demoScenarioEngine.mjs';
import {
  buildDiagnostics,
  buildDiagnosticsPath,
  buildMetadataPath,
  buildRunMetadata,
  buildSceneClipPath,
  writeJsonArtifact
} from './lib/demoDiagnostics.mjs';
import { evaluateDemoQualityGate } from './lib/demoQualityGate.mjs';
import { createDemoStepRunner } from './lib/demoStepRunner.mjs';
import { resolveComposeEnabled, composeSceneClips } from './lib/demoComposer.mjs';
import { runProdRecordingPreflight } from './lib/playwrightPreflight.mjs';
import { buildOrchestratorPlan } from './lib/demoOrchestratorPlan.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

/**
 * @param {string} command
 * @param {string[]} args
 */
async function runProcess(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: repoRoot, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
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
      resolve({ code: typeof code === 'number' ? code : 1, stdout, stderr })
    );
  });
}

async function ffmpegAvailable() {
  const command = process.platform === 'win32' ? 'where' : 'command';
  const args = process.platform === 'win32' ? ['ffmpeg'] : ['-v', 'ffmpeg'];
  try {
    const result = await runProcess(command, args);
    return result.code === 0;
  } catch {
    return false;
  }
}

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  const args = {
    mode: 'run',
    scenario: null,
    suite: null,
    dryRun: false,
    prod: false,
    runs: 1,
    captureSceneClips: process.env.DEMO_CAPTURE_SCENE_CLIPS === 'true',
    composeScenesFlag: null,
    baseUrl: (process.env.DEMO_BASE_URL || 'http://localhost:8080').replace(/\/+$/, '')
  };

  for (const token of argv) {
    if (token === 'list' || token === '--list') args.mode = 'list';
    else if (token === 'run') args.mode = 'run';
    else if (token === 'suite') args.mode = 'suite';
    else if (token === 'reliability') args.mode = 'reliability';
    else if (token === '--dry-run') args.dryRun = true;
    else if (token === '--prod') args.prod = true;
    else if (token === '--capture-scene-clips') args.captureSceneClips = true;
    else if (token === '--compose-scenes') args.composeScenesFlag = true;
    else if (token === '--no-compose-scenes') args.composeScenesFlag = false;
    else if (token.startsWith('--scenario=')) args.scenario = token.slice('--scenario='.length).trim() || null;
    else if (token.startsWith('--suite=')) args.suite = token.slice('--suite='.length).trim() || null;
    else if (token.startsWith('--base-url=')) args.baseUrl = token.slice('--base-url='.length).trim().replace(/\/+$/, '');
    else if (token.startsWith('--runs=')) {
      const runs = Number.parseInt(token.slice('--runs='.length), 10);
      args.runs = Number.isFinite(runs) ? Math.max(1, Math.min(30, runs)) : 1;
    }
  }

  if (args.mode === 'suite' && !args.suite) {
    throw new Error('Suite mode requires --suite=<name>.');
  }
  if ((args.mode === 'run' || args.mode === 'reliability') && !args.scenario && !args.suite) {
    throw new Error('Run/reliability mode requires --scenario=<id> or --suite=<name>.');
  }

  return args;
}

/**
 * @param {string} absoluteVideoPath
 * @param {string} videoRelativePath
 * @param {Array<{ sceneId: string, startedAtMs: number, finishedAtMs: number }>} sceneTimings
 * @returns {Promise<string[]>}
 */
async function extractSceneClips(absoluteVideoPath, videoRelativePath, sceneTimings) {
  if (!(await ffmpegAvailable())) {
    return [];
  }

  const created = [];
  const baseStartedAt = sceneTimings[0]?.startedAtMs || Date.now();
  for (const scene of sceneTimings) {
    const startSeconds = Math.max(0, (scene.startedAtMs - baseStartedAt) / 1000);
    const durationSeconds = Math.max(0.8, (scene.finishedAtMs - scene.startedAtMs) / 1000);
    const clipRelativePath = buildSceneClipPath(videoRelativePath, scene.sceneId);
    const clipAbsolutePath = path.resolve(repoRoot, clipRelativePath);
    const result = await runProcess('ffmpeg', [
      '-y',
      '-i',
      absoluteVideoPath,
      '-ss',
      `${startSeconds}`,
      '-t',
      `${durationSeconds}`,
      '-c',
      'copy',
      clipAbsolutePath
    ]);
    if (result.code === 0) {
      created.push(clipRelativePath);
    }
  }
  return created;
}

/**
 * @param {ReturnType<typeof parseArgs>} args
 */
async function runWithArgs(args) {
  await ensureDemoDirectory();

  const { registry } = await loadScenarioRegistry();
  if (args.mode === 'list') {
    const summaries = listScenarioSummaries(registry);
    console.log('Demo v2 scenarios:');
    for (const scenario of summaries) {
      const suites = scenario.suites.length ? scenario.suites.join(', ') : '-';
      console.log(
        `- ${scenario.id} | scenes=${scenario.sceneCount} | flow=${scenario.flowToken} | suites=${suites}`
      );
    }
    return 0;
  }

  const plan = buildOrchestratorPlan({
    registry,
    scenarioId: args.scenario,
    suite: args.suite
  });

  if (args.dryRun) {
    console.log(JSON.stringify({ mode: args.mode, dryRun: true, plan }, null, 2));
    return 0;
  }

  if (args.prod) {
    const preflight = await runProdRecordingPreflight({ requireStorageState: true });
    if (!preflight.ok) {
      console.error('[demo:v2] Production preflight failed.');
      for (const error of preflight.errors) {
        console.error(error);
      }
      return 1;
    }
  }

  const composeEnabled = resolveComposeEnabled({
    enabledFromFlag: process.env.DEMO_COMPOSE_SCENES === 'true',
    composeFlag: args.composeScenesFlag
  });
  let overallExitCode = 0;

  const maxRetries = Number.parseInt(process.env.DEMO_V2_MAX_RETRIES || '2', 10);
  const backoffMs = Number.parseInt(process.env.DEMO_V2_BACKOFF_MS || '350', 10);
  const reliabilityRuns = args.mode === 'reliability' ? args.runs : 1;

  for (let runNumber = 1; runNumber <= reliabilityRuns; runNumber += 1) {
    for (const planned of plan) {
      const scenario = expandScenarioSteps(
        registry.scenarios.find((entry) => entry.id === planned.scenarioId)
      );
      const runIndex = reliabilityRuns > 1 ? runNumber : null;
      const videoRelativePath = await allocateCanonicalArtifactRelativePath({
        flow: scenario.flowToken,
        runIndex
      });
      const absoluteVideoPath = path.resolve(repoRoot, videoRelativePath);
      const startedAtIso = new Date().toISOString();
      const diagnosticsBuffer = {
        retries: [],
        selectorFallbacks: [],
        sceneEvents: []
      };
      const actionCountRef = { value: 0 };
      const failureTaxonomy = [];
      /** @type {Array<Record<string, unknown>>} */
      const sceneTimingSummary = [];
      let status = 'passed';
      let failureReason = null;
      let composed = false;
      let composeSkippedReason = null;

      const runner = createDemoStepRunner({
        baseUrl: args.baseUrl,
        maxRetries,
        backoffMs,
        diagnostics: diagnosticsBuffer
      });

      try {
        await runner.openSession();
        for (const scene of scenario.scenes) {
          try {
            const summary = await runner.runScene(scene, actionCountRef);
            sceneTimingSummary.push(summary);
          } catch (error) {
            failureTaxonomy.push('SCENE_FAILURE');
            throw new Error(
              `Scene "${scene.id}" failed: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }
        await runner.stopVideo(videoRelativePath);
      } catch (error) {
        status = 'failed';
        failureReason = error instanceof Error ? error.message : String(error);
        if (!failureTaxonomy.length) {
          failureTaxonomy.push('ACTION_FAILURE');
        }
      } finally {
        await runner.closeSession();
      }

      let sceneClipRelativePaths = [];
      if (args.captureSceneClips && sceneTimingSummary.length > 0) {
        sceneClipRelativePaths = await extractSceneClips(
          absoluteVideoPath,
          videoRelativePath,
          sceneTimingSummary.map((scene) => ({
            sceneId: String(scene.sceneId),
            startedAtMs: Number(scene.startedAtMs),
            finishedAtMs: Number(scene.finishedAtMs)
          }))
        );
      }

      if (composeEnabled) {
        const composedRelativePath = videoRelativePath.replace(/\.webm$/i, '.composed.webm');
        const composeResult = await composeSceneClips({
          repoRoot,
          sceneClipRelativePaths,
          outputRelativePath: composedRelativePath,
          introText: scenario.title,
          outroText: 'EquipQR Demo Complete'
        });
        composed = Boolean(composeResult.composed);
        composeSkippedReason = composeResult.skippedReason || null;
      }

      const totalDurationMs =
        sceneTimingSummary.length > 0
          ? Number(sceneTimingSummary[sceneTimingSummary.length - 1].finishedAtMs) -
            Number(sceneTimingSummary[0].startedAtMs)
          : 0;
      const requiredCheckpointCount = sceneTimingSummary.reduce(
        (count, item) => count + Number(item.requiredCheckpointCount || 0),
        0
      );
      const passedCheckpointCount = sceneTimingSummary.reduce(
        (count, item) => count + Number(item.passedCheckpointCount || 0),
        0
      );

      const qualityGate = evaluateDemoQualityGate({
        scenarioMinDurationMs: scenario.targetDurationMs?.min || 3000,
        totalDurationMs,
        activityCount: actionCountRef.value,
        requiredCheckpointCount,
        passedCheckpointCount
      });

      if (!qualityGate.passed) {
        status = 'failed';
        for (const failure of qualityGate.failures) {
          if (!failureTaxonomy.includes(failure.code)) {
            failureTaxonomy.push(failure.code);
          }
        }
      }

      const finishedAtIso = new Date().toISOString();
      const metadata = buildRunMetadata({
        command: `node scripts/demo-record-v2.mjs ${process.argv.slice(2).join(' ')}`.trim(),
        baseUrl: args.baseUrl,
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        flowToken: scenario.flowToken,
        runIndex,
        videoRelativePath,
        status,
        reason: failureReason,
        startedAtIso,
        finishedAtIso,
        sceneTimings: sceneTimingSummary,
        activity: {
          actionCount: actionCountRef.value,
          retryCount: diagnosticsBuffer.retries.length,
          selectorFallbackCount: diagnosticsBuffer.selectorFallbacks.length,
          checkpointPassCount: passedCheckpointCount,
          checkpointFailCount: Math.max(0, requiredCheckpointCount - passedCheckpointCount)
        },
        qualityGate,
        compose: {
          enabled: composeEnabled,
          attempted: composeEnabled,
          composed,
          skippedReason: composeSkippedReason || undefined
        },
        env: process.env
      });
      const diagnostics = buildDiagnostics({
        command: metadata.command,
        scenarioId: scenario.id,
        flowToken: scenario.flowToken,
        runIndex,
        failureTaxonomy,
        selectorFallbacks: diagnosticsBuffer.selectorFallbacks,
        retries: diagnosticsBuffer.retries,
        sceneEvents: diagnosticsBuffer.sceneEvents,
        qualityGate,
        env: process.env
      });

      await writeJsonArtifact(repoRoot, buildMetadataPath(videoRelativePath), metadata);
      await writeJsonArtifact(repoRoot, buildDiagnosticsPath(videoRelativePath), diagnostics);

      for (const scene of sceneTimingSummary) {
        const sceneMetadataPath = videoRelativePath.replace(
          /\.webm$/i,
          `.scene-${String(scene.sceneId)}.metadata.json`
        );
        await writeJsonArtifact(repoRoot, sceneMetadataPath, {
          scenarioId: scenario.id,
          sceneId: scene.sceneId,
          flowToken: scenario.flowToken,
          status,
          timing: scene,
          runIndex
        });
      }

      if (status !== 'passed') {
        overallExitCode = 1;
      }

      console.log(
        `[demo:v2] ${scenario.id} run=${runNumber}/${reliabilityRuns} status=${status} video=${videoRelativePath}`
      );
      if (sceneClipRelativePaths.length) {
        console.log(`[demo:v2] Scene clips: ${sceneClipRelativePaths.join(', ')}`);
      }
    }
  }

  return overallExitCode;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const exitCode = await runWithArgs(args);
  process.exit(exitCode);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`[demo:v2] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}

export { parseArgs, runWithArgs };
