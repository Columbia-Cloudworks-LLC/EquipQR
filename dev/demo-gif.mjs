#!/usr/bin/env node

import path from 'path';
import { parseDemoGifArgs } from './lib/demoGifArgs.mjs';
import { allocateCanonicalArtifactRelativePath, ensureDemoDirectory } from './lib/demoArtifactPaths.mjs';
import {
  demoGifRepoRoot,
  runCommand,
  runPlaywrightCommand,
  sleep,
  ensureBinaryAvailable,
} from './lib/demoGifPlaywright.mjs';
import {
  loadManifest,
  printScenarioList,
  loadScenario,
  resolveViewportConfig,
  runScenarioSteps,
} from './lib/demoGifScenario.mjs';
import { runRecordedSession, assertVideoArtifact, runSmokeVideoRecording } from './lib/demoGifRecording.mjs';
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
  const viewport = resolveViewportConfig(scenario.viewport);

  await runRecordedSession({
    base,
    viewport,
    webmRelativePath,
    personaName: parsedArgs.persona || scenario.auth?.persona || 'Alex Apex',
    afterLogin: async () => {
      await runPlaywrightCommand(`playwright-cli goto ${base}${scenario.route}`);
      await sleep(1500);

      await runScenarioSteps(scenario);
    },
    afterStop: async () => {
      if (parsedArgs.videoOnly) {
        await assertVideoArtifact(webmRelativePath);
        return;
      }
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
    },
  });
}

main().catch((error) => {
  console.error(`Demo generation failed: ${error.message}`);
  process.exit(1);
});
