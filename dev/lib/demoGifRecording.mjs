import fs from 'fs/promises';
import path from 'path';
import { resolveSmokeWebmRelativePath, isLocalhostBaseUrl } from './demoGifArgs.mjs';
import {
  allocateCanonicalArtifactRelativePath,
  ensureDemoDirectory,
} from './demoArtifactPaths.mjs';
import {
  demoGifRepoRoot,
  runCommand,
  runPlaywrightCommand,
  sleep,
  ensureBinaryAvailable,
} from './demoGifPlaywright.mjs';
import { loginAsAlexApex, loginWithPersona, waitForDashboardOrThrow } from './demoGifAuth.mjs';
import { defaultViewportByProfile } from './demoGifScenario.mjs';

/**
 * @param {string} webmRelativePath
 */
export async function stopVideoAtPath(webmRelativePath) {
  const normalizedPath = webmRelativePath.replaceAll('\\', '/');
  const legacyResult = await runCommand(`playwright-cli video-stop ${normalizedPath}`, {
    allowFailure: true,
    quiet: true,
  });

  if (legacyResult.code === 0) {
    return;
  }

  await runPlaywrightCommand(`playwright-cli video-stop --filename "${normalizedPath}"`);
}

/**
 * @param {import('./demoGifArgs.mjs').DemoGifCliArgs} parsedArgs
 */
export async function runSmokeVideoRecording(parsedArgs) {
  const base = parsedArgs.baseUrl;
  const runIndex = Number.parseInt(process.env.DEMO_RUN_INDEX || '', 10);
  const webmRelativePath = parsedArgs.out
    ? resolveSmokeWebmRelativePath({ out: parsedArgs.out })
    : await allocateCanonicalArtifactRelativePath({
        flow: 'demo-smoke',
        runIndex: Number.isInteger(runIndex) ? runIndex : null,
      });

  await ensureBinaryAvailable('playwright-cli');

  await ensureDemoDirectory();

  const viewport = defaultViewportByProfile.desktop;
  let videoStarted = false;

  try {
    await runPlaywrightCommand('playwright-cli open about:blank');
    await runPlaywrightCommand(`playwright-cli resize ${viewport.width} ${viewport.height}`);
    await runPlaywrightCommand('playwright-cli video-start');
    videoStarted = true;

    await runPlaywrightCommand(`playwright-cli goto ${base}/`);
    await sleep(900);

    if (isLocalhostBaseUrl(base)) {
      const personaName = parsedArgs.persona || 'Alex Apex';
      if (personaName === 'Alex Apex') {
        await loginAsAlexApex(base);
      } else {
        await loginWithPersona(base, { persona: personaName });
      }
    } else {
      await waitForDashboardOrThrow(base);
    }

    await runPlaywrightCommand(`playwright-cli goto ${base}/dashboard`);
    await sleep(1800);
    await runPlaywrightCommand('playwright-cli snapshot');

    await stopVideoAtPath(webmRelativePath);
    videoStarted = false;

    const webmAbsolutePath = path.resolve(demoGifRepoRoot, webmRelativePath);
    const stat = await fs.stat(webmAbsolutePath).catch(() => null);
    if (!stat || stat.size < 256) {
      throw new Error(`Video artifact missing or too small: ${webmRelativePath}`);
    }
    console.log(`Video saved: ${webmAbsolutePath}`);
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
