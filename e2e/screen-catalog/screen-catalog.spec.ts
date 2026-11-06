/**
 * Screen catalog capture. One test per (flow, persona, screen); each writes
 * PNG slices plus screen.json under SCREEN_CATALOG_OUT, which
 * dev/screen-catalog/build-gallery.mjs turns into the browsable gallery.
 *
 * Run through `npm run screens:capture` (dev/linux/screen-catalog.sh), which
 * resets the local database first so every run starts from the same seed.
 */
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { test, type Page } from '@playwright/test';
import { pinContextToOrg } from '../user/shared/auth-helpers';
import { apexOrgId, authStatePath, personas } from '../user/shared/seed-data';
import {
  captureSlices,
  collectContext,
  describeStep,
  detectCaptureMode,
  planScroll,
  resolveTarget,
  runSteps,
  settle,
} from './capture';
import { loadScreenCatalogSettings } from './config';
import { buildRunTimePattern, markRunTimestamps, replaceRunTimestamps, RUN_TIME_PLACEHOLDER } from './run-time-mask';

/** Live third-party map tiles render differently on every load; painted over unless --live-maps. */
const MAP_MASK = ['.gm-style'];
import { catalogFlows } from './flows';
import type { CapturedScreen, CatalogFlow, CatalogPersona, CatalogScreen } from './types';

const settings = loadScreenCatalogSettings();
const repoRoot = process.cwd();

const csv = (value: string | undefined) =>
  value
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean) ?? [];
const onlyFlows = csv(process.env.SCREEN_CATALOG_FLOWS);
const onlyPersonas = csv(process.env.SCREEN_CATALOG_PERSONAS);

function personaLabel(persona: CatalogPersona): string {
  if (persona === 'anonymous') return 'Logged out';
  const role = persona === 'owner' ? 'Owner' : 'Technician';
  return `${personas[persona].displayName} (${role})`;
}

function validateManifest(flows: CatalogFlow[]): void {
  const problems: string[] = [];
  const flowIds = new Set<string>();
  for (const flow of flows) {
    if (flowIds.has(flow.id)) problems.push(`Duplicate flow id "${flow.id}"`);
    flowIds.add(flow.id);
    const screenIds = new Set<string>();
    for (const screen of flow.screens) {
      if (screenIds.has(screen.id)) problems.push(`Duplicate screen id "${flow.id}/${screen.id}"`);
      screenIds.add(screen.id);
      for (const source of screen.sources) {
        if (!fs.existsSync(path.join(repoRoot, source))) {
          problems.push(`${flow.id}/${screen.id}: source file not found: ${source}`);
        }
      }
      for (const persona of screen.personas ?? []) {
        if (!flow.personas.includes(persona)) {
          problems.push(`${flow.id}/${screen.id}: persona "${persona}" is not in the flow's personas`);
        }
      }
    }
  }
  const unknownFlows = onlyFlows.filter((id) => !flowIds.has(id));
  if (unknownFlows.length) problems.push(`Unknown --flow id(s): ${unknownFlows.join(', ')}`);
  if (problems.length) throw new Error(`Screen catalog manifest is invalid:\n- ${problems.join('\n- ')}`);
}

validateManifest(catalogFlows);

/** Browser-side setup that removes run-to-run noise. Runs before any app script. */
function stabilizeInitScript(): void {
  localStorage.setItem('equipqr:cookie-consent', 'accepted');

  // Seeded PRNG so anything cosmetic built on Math.random renders the same each run.
  let seed = 0x5eed1234;
  Math.random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const css = `
    *, *::before, *::after {
      transition-duration: 0s !important;
      transition-delay: 0s !important;
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      animation-iteration-count: 1 !important;
      caret-color: transparent !important;
      scroll-behavior: auto !important;
    }
    [data-sonner-toaster] { display: none !important; }
  `;
  const inject = () => {
    const style = document.createElement('style');
    style.setAttribute('data-screen-catalog', 'stabilize');
    style.textContent = css;
    document.head.appendChild(style);
  };
  if (document.head) inject();
  else document.addEventListener('DOMContentLoaded', inject, { once: true });
}

async function preparePage(page: Page, persona: CatalogPersona): Promise<void> {
  if (settings.clock) {
    await page.clock.install({ time: new Date(settings.clock) });
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.context().addInitScript(stabilizeInitScript);
  if (persona !== 'anonymous') {
    await pinContextToOrg(page.context(), apexOrgId);
  }
}

function screenDirFor(flow: CatalogFlow, persona: CatalogPersona, screen: CatalogScreen, order: number) {
  return path.join(settings.outDir, 'screens', flow.id, persona, `${String(order).padStart(2, '0')}-${screen.id}`);
}

for (const flow of catalogFlows) {
  if (onlyFlows.length && !onlyFlows.includes(flow.id)) continue;

  for (const persona of flow.personas) {
    if (onlyPersonas.length && !onlyPersonas.includes(persona)) continue;

    test.describe(`${flow.id} [${persona}]`, () => {
      test.use({
        storageState:
          persona === 'anonymous'
            ? { cookies: [], origins: [] }
            : path.join(repoRoot, authStatePath(persona)),
      });

      flow.screens.forEach((screen, index) => {
        if (screen.personas && !screen.personas.includes(persona)) return;
        const order = index + 1;

        test(screen.id, async ({ page }, testInfo) => {
          const dir = screenDirFor(flow, persona, screen, order);
          await fsp.rm(dir, { recursive: true, force: true });
          await fsp.mkdir(dir, { recursive: true });

          const consoleErrors: string[] = [];
          const failedRequests: string[] = [];
          page.on('console', (message) => {
            if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 500));
          });
          page.on('pageerror', (error) => consoleErrors.push(`Uncaught: ${error.message}`.slice(0, 500)));
          page.on('response', (response) => {
            if (response.status() >= 400) {
              const url = response.url().split('?')[0];
              failedRequests.push(`${response.status()} ${response.request().method()} ${url}`);
            }
          });
          page.on('requestfailed', (request) => {
            const url = request.url().split('?')[0];
            failedRequests.push(`FAILED ${request.method()} ${url} (${request.failure()?.errorText ?? 'unknown'})`);
          });

          const viewport = page.viewportSize() ?? { width: 0, height: 0 };
          const record: CapturedScreen = {
            flowId: flow.id,
            flowTitle: flow.title,
            area: flow.area,
            screenId: screen.id,
            screenTitle: screen.title,
            description: screen.description,
            persona,
            personaLabel: personaLabel(persona),
            device: settings.deviceName,
            viewport: { ...viewport, deviceScaleFactor: settings.deviceScaleFactor },
            clock: settings.clock ?? 'real',
            route: screen.route,
            finalUrl: '',
            pageTitle: '',
            howToReach: [
              persona === 'anonymous' ? 'Signed out' : `Signed in as ${personaLabel(persona)}`,
              `Open ${screen.route}`,
              ...(screen.steps ?? []).map(describeStep),
            ],
            sources: screen.sources,
            status: 'ok',
            warnings: [],
            notes: [],
            captureMode: 'page',
            scroll: { container: '', scrollHeight: 0, clientHeight: 0, topInset: 0, bottomInset: 0, truncated: false },
            dir: path.relative(settings.outDir, dir).split(path.sep).join('/'),
            slices: [],
            headings: [],
            visibleText: '',
            ariaSnapshot: '',
            consoleErrors,
            failedRequests,
            capturedAt: new Date().toISOString(),
            orderIndex: order,
          };
          const writeRecord = () =>
            fsp.writeFile(path.join(dir, 'screen.json'), `${JSON.stringify(record, null, 2)}\n`);
          const relative = (file: string) => path.relative(settings.outDir, file).split(path.sep).join('/');

          try {
            await preparePage(page, persona);
            await page.goto(screen.route);
            const loadWarning = await settle(page);
            if (loadWarning) record.warnings.push(`After load: ${loadWarning}`);

            await runSteps(page, screen.steps ?? []);
            if (screen.ready) {
              await resolveTarget(page, screen.ready).waitFor({ state: 'visible', timeout: 20_000 });
            }
            const finalWarning = await settle(page);
            if (finalWarning) record.warnings.push(`Before capture: ${finalWarning}`);

            const mode = screen.capture ?? (await detectCaptureMode(page, (screen.steps ?? []).length > 0));
            const plan = await planScroll(page, mode);
            if (plan.truncated) {
              record.warnings.push(`Page is taller than ${plan.offsets.length} slices; the bottom was not captured.`);
            }
            const runTimePattern = buildRunTimePattern(settings.runStartedAt, new Date(), settings.timezoneId);
            const masked = await markRunTimestamps(page, runTimePattern);
            const context = await collectContext(page, mode);
            context.visibleText = replaceRunTimestamps(context.visibleText, runTimePattern);
            context.ariaSnapshot = replaceRunTimestamps(context.ariaSnapshot, runTimePattern);
            context.headings = context.headings.map((heading) => replaceRunTimestamps(heading, runTimePattern));
            context.pageTitle = replaceRunTimestamps(context.pageTitle, runTimePattern);
            const mapMask = settings.liveMaps ? [] : MAP_MASK;
            if (mapMask.length && (await page.locator(mapMask.join(', ')).count()) > 0) {
              record.notes.push('Google Maps tiles are masked (live third-party content). Run with --live-maps to show them.');
            }
            const slices = await captureSlices(page, plan, dir, [...(screen.mask ?? []), ...mapMask], async () => {
              // Scrolling can render new rows; mark their run-time timestamps too.
              masked.push(...(await markRunTimestamps(page, runTimePattern)));
            });
            if (masked.length) {
              record.notes.push(
                `${masked.length} timestamp(s) written by the DB reset are shown as ${RUN_TIME_PLACEHOLDER} in the screenshots and text (they change every run).`,
              );
            }

            Object.assign(record, context, {
              captureMode: mode,
              finalUrl: page.url().replace(settings.baseURL, ''),
              scroll: {
                container: plan.container,
                scrollHeight: plan.scrollHeight,
                clientHeight: plan.clientHeight,
                topInset: plan.topInset,
                bottomInset: plan.bottomInset,
                truncated: plan.truncated,
              },
              slices: slices.map((slice) => ({ ...slice, file: relative(slice.file) })),
            });
            await writeRecord();
          } catch (error) {
            record.status = 'error';
            record.error = error instanceof Error ? error.message : String(error);
            record.finalUrl = page.url().replace(settings.baseURL, '');
            const file = path.join(dir, 'slice-01.png');
            await page.screenshot({ path: file, animations: 'disabled', caret: 'hide' }).then(
              () => {
                record.slices = [{ file: relative(file), index: 1, scrollTop: 0 }];
              },
              () => undefined,
            );
            await writeRecord();
            testInfo.annotations.push({ type: 'screen-catalog', description: record.error });
            throw error;
          }
        });
      });
    });
  }
}
