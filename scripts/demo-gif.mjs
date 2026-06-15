#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { parseDemoGifArgs, isLocalhostBaseUrl } from './lib/demoGifArgs.mjs';
import { allocateCanonicalArtifactRelativePath, ensureDemoDirectory } from './lib/demoArtifactPaths.mjs';
import {
  demoGifRepoRoot,
  runCommand,
  runPlaywrightCommand,
  sleep,
  ensureBinaryAvailable,
} from './lib/demoGifPlaywright.mjs';
import { loginAsAlexApex, loginWithPersona, waitForDashboardOrThrow } from './lib/demoGifAuth.mjs';
import {
  loadManifest,
  printScenarioList,
  loadScenario,
  resolveViewportConfig,
  runScenarioSteps,
} from './lib/demoGifScenario.mjs';
import { stopVideoAtPath, runSmokeVideoRecording } from './lib/demoGifRecording.mjs';
import {
  buildRecordingGifFfmpegFilter,
  probeVideoDimensions,
} from './lib/recording-quality.mjs';

async function main() {
  const parsedArgs = parseDemoGifArgs(process.argv.slice(2));
  const { scenarios } = await loadManifest();

  if (parsedArgs.listOnly) {
    printScenarioList(scenarios, {
      category: parsedArgs.category,
      audience: parsedArgs.audience,
      tag: parsedArgs.tag,
    });
    return;
  }

  if (parsedArgs.smoke) {
    await runSmokeVideoRecording(parsedArgs);
    return;
  }

  const scenario = await loadScenario(parsedArgs.scenarioName);

  await ensureBinaryAvailable('playwright-cli');
  if (!parsedArgs.videoOnly) {
    await ensureBinaryAvailable('ffmpeg');
    await ensureBinaryAvailable('ffprobe');
  }

  await ensureDemoDirectory();

  const runIndex = Number.parseInt(process.env.DEMO_RUN_INDEX || '', 10);
  const webmRelativePath = await allocateCanonicalArtifactRelativePath({
    flow: `scenario-${scenario.name.replace(/[/\\]/g, '-')}`,
    runIndex: Number.isInteger(runIndex) ? runIndex : null,
  });
  const gifRelativePath = path.join('tmp', 'demos', `${scenario.name}.gif`);
  const gifAbsolutePath = path.resolve(demoGifRepoRoot, gifRelativePath);
  const webmAbsolutePath = path.resolve(demoGifRepoRoot, webmRelativePath);

  const base = parsedArgs.baseUrl;
  let videoStarted = false;

  try {
    await runPlaywrightCommand('playwright-cli open about:blank');
    const viewport = resolveViewportConfig(scenario.viewport);
    await runPlaywrightCommand(`playwright-cli resize ${viewport.width} ${viewport.height}`);
    await runPlaywrightCommand('playwright-cli video-start');
    videoStarted = true;

    await runPlaywrightCommand(`playwright-cli goto ${base}`);

    const personaName = parsedArgs.persona || scenario.auth?.persona || 'Alex Apex';
    if (isLocalhostBaseUrl(base)) {
      if (personaName === 'Alex Apex') {
        await loginAsAlexApex(base);
      } else {
        await loginWithPersona(base, { persona: personaName });
      }
    } else {
      await waitForDashboardOrThrow(base);
    }

    await runPlaywrightCommand(`playwright-cli goto ${base}${scenario.route}`);
    await sleep(1500);

    await runScenarioSteps(scenario);

    await stopVideoAtPath(webmRelativePath);
    videoStarted = false;

    if (!parsedArgs.videoOnly) {
      const dimensions = await probeVideoDimensions(webmAbsolutePath);
      const videoFilter = buildRecordingGifFfmpegFilter(
        dimensions.width,
        dimensions.height,
        viewport,
      );
      await runCommand(
        `ffmpeg -y -i "${webmRelativePath}" -vf "${videoFilter}" "${gifRelativePath}"`,
        { cwd: demoGifRepoRoot },
      );
      console.log(`GIF generated: ${gifAbsolutePath}`);
    } else {
      const stat = await fs.stat(webmAbsolutePath).catch(() => null);
      if (!stat || stat.size < 256) {
        throw new Error(`Video artifact missing or too small: ${webmRelativePath}`);
      }
      console.log(`Video saved: ${webmAbsolutePath}`);
    }
  } catch (error) {
    console.error(`Demo generation failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  } finally {
    if (videoStarted) {
      await stopVideoAtPath(webmRelativePath).catch(() => undefined);
    }
    await runCommand('playwright-cli close', { allowFailure: true });
  }
}

main().catch((error) => {
  console.error(`Demo generation failed: ${error.message}`);
  process.exit(1);
});
