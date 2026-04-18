import { spawn } from 'child_process';

/**
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {string} value
 */
function jsString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * @param {string} value
 */
function regexLiteral(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
   * @param {Record<string, unknown>} step
   * @param {() => Promise<void>} fn
   */
  async function withRetries(sceneId, stepIndex, step, fn) {
    let attempt = 0;
    // bounded retry with capped backoff for expected UI timing jitter.
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
          waitMs
        });
        await sleep(waitMs);
        attempt += 1;
      }
    }
  }

  /**
   * @param {string} role
   * @param {string} name
   * @param {string[]} fallbackSelectors
   * @param {{ required?: boolean, sceneId: string, stepIndex: number, actionName: string }} context
   */
  async function clickWithSelectorStrategy(role, name, fallbackSelectors, context) {
    const markerFallback = 'DEMO_SELECTOR_FALLBACK';
    const markerPrimary = 'DEMO_SELECTOR_PRIMARY';
    const roleEscaped = jsString(role);
    const nameEscaped = jsString(regexLiteral(name));
    const fallbackJson = JSON.stringify(fallbackSelectors || []);
    const script = `() => {
      const needle = new RegExp('${nameEscaped}', 'i');
      const byRole = Array.from(document.querySelectorAll('[role=\\'${roleEscaped}\\']')).find((el) => needle.test(el.textContent || '') && !el.hasAttribute('disabled'));
      if (byRole) {
        console.log('${markerPrimary}');
        byRole.click();
        return;
      }
      const selectors = ${fallbackJson};
      for (const selector of selectors) {
        const fallbackMatch = Array.from(document.querySelectorAll(selector)).find((el) => needle.test(el.textContent || '') && !el.hasAttribute('disabled'));
        if (fallbackMatch) {
          console.log('${markerFallback}:' + selector);
          fallbackMatch.click();
          return;
        }
      }
      throw new Error('Required element missing for role/name strategy');
    }`;

    try {
      const output = await runPlaywrightEval(script);
      if (markerSeen(output, markerFallback)) {
        const used = output
          .split('\n')
          .find((line) => line.includes(`${markerFallback}:`))
          ?.split(`${markerFallback}:`)[1]
          ?.trim();
        opts.diagnostics.selectorFallbacks.push({
          sceneId: context.sceneId,
          stepIndex: context.stepIndex,
          action: context.actionName,
          selector: used || 'unknown'
        });
      }
    } catch (error) {
      if (context.required === false) {
        opts.diagnostics.sceneEvents.push({
          type: 'optional-step-skipped',
          sceneId: context.sceneId,
          stepIndex: context.stepIndex,
          action: context.actionName,
          reason: 'element-missing'
        });
        return;
      }
      throw error;
    }
  }

  /**
   * @param {Record<string, unknown>} checkpoint
   */
  async function verifyCheckpoint(checkpoint) {
    if (checkpoint.type === 'urlIncludes') {
      const value = jsString(String(checkpoint.value || ''));
      await runPlaywrightEval(
        `() => { if (!window.location.href.includes('${value}')) throw new Error('Checkpoint failed: urlIncludes'); }`
      );
      return true;
    }

    if (checkpoint.type === 'textVisible') {
      const text = jsString(regexLiteral(String(checkpoint.text || checkpoint.value || '')));
      await runPlaywrightEval(
        `() => { const ok = Array.from(document.querySelectorAll('body *')).some((el) => new RegExp('${text}', 'i').test(el.textContent || '')); if (!ok) throw new Error('Checkpoint failed: textVisible'); }`
      );
      return true;
    }

    throw new Error(`Unsupported checkpoint type "${checkpoint.type}".`);
  }

  /**
   * @param {Record<string, unknown>} step
   * @param {{ sceneId: string, stepIndex: number, actionCountRef: { value: number } }} context
   */
  async function runAction(step, context) {
    const actionName = String(step.action || '');
    switch (actionName) {
      case 'navigateWithWait': {
        const route = String(step.route || '/dashboard');
        await runPlaywright(['goto', buildRouteUrl(opts.baseUrl, route)]);
        await runPlaywright(['snapshot']);
        await sleep(700);
        context.actionCountRef.value += 1;
        return;
      }
      case 'clickRole': {
        const role = String(step.role || 'button');
        const name = String(step.name || '');
        if (!name) throw new Error('clickRole requires "name".');
        const fallbackSelectors = Array.isArray(step.fallbackSelectors)
          ? step.fallbackSelectors.map((item) => String(item))
          : ['button', 'a', '[role="button"]'];
        await clickWithSelectorStrategy(role, name, fallbackSelectors, {
          required: step.required === false ? false : true,
          sceneId: context.sceneId,
          stepIndex: context.stepIndex,
          actionName
        });
        context.actionCountRef.value += 1;
        return;
      }
      case 'clickText': {
        const rawText = String(step.text || '');
        const pattern = step.regex === true ? rawText : regexLiteral(rawText);
        const text = jsString(pattern);
        const selector = jsString(String(step.selector || 'button,[role="button"],a'));
        await withRetries(context.sceneId, context.stepIndex, step, async () => {
          await runPlaywrightEval(
            `() => { const el = Array.from(document.querySelectorAll('${selector}')).find((node) => new RegExp('${text}', 'i').test(node.textContent || '') && !node.hasAttribute('disabled')); if (!el) throw new Error('clickText missing element'); el.click(); }`
          );
        });
        context.actionCountRef.value += 1;
        return;
      }
      case 'fillRole': {
        const name = jsString(regexLiteral(String(step.name || '')));
        const value = jsString(String(step.value || ''));
        const fallbackSelectors = Array.isArray(step.fallbackSelectors)
          ? step.fallbackSelectors.map((item) => String(item))
          : ['input[type="search"]', 'input', 'textarea'];
        const fallbackJson = JSON.stringify(fallbackSelectors);
        await withRetries(context.sceneId, context.stepIndex, step, async () => {
          const output = await runPlaywrightEval(`() => {
            const needle = new RegExp('${name}', 'i');
            let input = Array.from(document.querySelectorAll('label')).map((label) => {
              const t = label.textContent || '';
              if (!needle.test(t)) return null;
              const id = label.getAttribute('for');
              if (id) return document.getElementById(id);
              return label.querySelector('input,textarea');
            }).find(Boolean);
            if (!input) {
              const selectors = ${fallbackJson};
              for (const selector of selectors) {
                const candidate = document.querySelector(selector);
                if (candidate) {
                  console.log('DEMO_SELECTOR_FALLBACK:' + selector);
                  input = candidate;
                  break;
                }
              }
            }
            if (!input) throw new Error('fillRole missing input');
            input.focus();
            input.value = '${value}';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }`);
          const fallbackLine = output
            .split('\n')
            .find((line) => line.includes('DEMO_SELECTOR_FALLBACK:'));
          if (fallbackLine) {
            opts.diagnostics.selectorFallbacks.push({
              sceneId: context.sceneId,
              stepIndex: context.stepIndex,
              action: actionName,
              selector: fallbackLine.split('DEMO_SELECTOR_FALLBACK:')[1]?.trim() || 'unknown'
            });
          }
        });
        context.actionCountRef.value += 1;
        return;
      }
      case 'selectOption': {
        const selector = jsString(String(step.selector || 'select'));
        const value = jsString(String(step.value || ''));
        await runPlaywrightEval(
          `() => { const el = document.querySelector('${selector}'); if (!el) throw new Error('selectOption missing select'); el.value = '${value}'; el.dispatchEvent(new Event('change', { bubbles: true })); }`
        );
        context.actionCountRef.value += 1;
        return;
      }
      case 'openDrawer':
      case 'openMenu':
      case 'openDialog': {
        const selector = jsString(String(step.selector || 'button,[role="button"]'));
        await runPlaywrightEval(
          `() => { const el = document.querySelector('${selector}'); if (!el) throw new Error('open action missing selector'); el.click(); }`
        );
        context.actionCountRef.value += 1;
        return;
      }
      case 'safeClose': {
        await runPlaywright(['press', 'Escape']).catch(async () => {
          await runPlaywrightEval(
            `() => { const closeBtn = document.querySelector('[aria-label*=\\'close\\' i],button[title*=\\'close\\' i]'); if (closeBtn) closeBtn.click(); }`
          );
        });
        context.actionCountRef.value += 1;
        return;
      }
      case 'scrollSection': {
        const pixels = Number(step.pixels) || 400;
        await runPlaywrightEval(`() => { window.scrollBy({ top: ${pixels}, behavior: 'smooth' }); }`);
        await sleep(500);
        context.actionCountRef.value += 1;
        return;
      }
      case 'focusElement': {
        const selector = jsString(String(step.selector || 'input,button,[tabindex]'));
        await runPlaywrightEval(
          `() => { const el = document.querySelector('${selector}'); if (!el) throw new Error('focusElement missing selector'); el.focus(); }`
        );
        context.actionCountRef.value += 1;
        return;
      }
      case 'hoverReveal': {
        const selector = jsString(String(step.selector || 'button,a,[role="button"]'));
        await runPlaywrightEval(
          `() => { const el = document.querySelector('${selector}'); if (!el) throw new Error('hoverReveal missing selector'); el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); }`
        );
        context.actionCountRef.value += 1;
        return;
      }
      case 'waitForNetworkIdle': {
        const maxMs = Math.min(6000, Math.max(300, Number(step.maxMs) || 1800));
        await sleep(maxMs);
        return;
      }
      case 'pauseReadable': {
        const ms = Math.min(2600, Math.max(300, Number(step.ms) || 900));
        await sleep(ms);
        return;
      }
      case 'clickByLabel': {
        const label = jsString(regexLiteral(String(step.label || '')));
        if (!label) throw new Error('clickByLabel requires "label".');
        await withRetries(context.sceneId, context.stepIndex, step, async () => {
          await runPlaywrightEval(`() => {
            const needle = new RegExp('${label}', 'i');
            const el = Array.from(document.querySelectorAll('[aria-label]')).find((node) => needle.test(node.getAttribute('aria-label') || '') && !node.hasAttribute('disabled'));
            if (!el) throw new Error('clickByLabel missing element for label');
            el.click();
          }`);
        });
        context.actionCountRef.value += 1;
        return;
      }
      case 'clickHiddenButton': {
        const label = jsString(regexLiteral(String(step.label || '')));
        const parentSelector = jsString(String(step.parentSelector || ''));
        if (!label) throw new Error('clickHiddenButton requires "label".');
        await withRetries(context.sceneId, context.stepIndex, step, async () => {
          await runPlaywrightEval(`() => {
            const needle = new RegExp('${label}', 'i');
            const parentSelector = '${parentSelector}';
            const button = Array.from(document.querySelectorAll('[aria-label]')).find((node) => needle.test(node.getAttribute('aria-label') || '') && !node.hasAttribute('disabled'));
            if (!button) throw new Error('clickHiddenButton missing button');
            const parent = parentSelector
              ? button.closest(parentSelector)
              : button.closest('.group') || button.parentElement;
            if (parent) {
              parent.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
              parent.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            }
            button.click();
          }`);
        });
        context.actionCountRef.value += 1;
        return;
      }
      case 'fillNumberInput': {
        const name = jsString(regexLiteral(String(step.name || step.label || '')));
        const value = jsString(String(step.value ?? ''));
        if (!name) throw new Error('fillNumberInput requires "name" or "label".');
        await withRetries(context.sceneId, context.stepIndex, step, async () => {
          await runPlaywrightEval(`() => {
            const needle = new RegExp('${name}', 'i');
            let input = null;
            const labels = Array.from(document.querySelectorAll('label'));
            for (const label of labels) {
              if (!needle.test(label.textContent || '')) continue;
              const id = label.getAttribute('for');
              if (id) {
                const candidate = document.getElementById(id);
                if (candidate && (candidate.tagName === 'INPUT' || candidate.getAttribute('role') === 'spinbutton')) {
                  input = candidate;
                  break;
                }
              }
              const inner = label.querySelector('input,[role=\\'spinbutton\\']');
              if (inner) { input = inner; break; }
            }
            if (!input) {
              input = Array.from(document.querySelectorAll('input[type=\\'number\\'],[role=\\'spinbutton\\']')).find((el) => needle.test(el.getAttribute('aria-label') || ''));
            }
            if (!input) throw new Error('fillNumberInput missing number input');
            input.focus();
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            setter.call(input, '${value}');
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            input.blur();
          }`);
        });
        context.actionCountRef.value += 1;
        return;
      }
      case 'clickTab': {
        const name = jsString(regexLiteral(String(step.name || '')));
        if (!name) throw new Error('clickTab requires "name".');
        await withRetries(context.sceneId, context.stepIndex, step, async () => {
          await runPlaywrightEval(`() => {
            const needle = new RegExp('${name}', 'i');
            const tab = Array.from(document.querySelectorAll('[role=\\'tab\\']')).find((el) => needle.test(el.textContent || '') && !el.hasAttribute('disabled'));
            if (!tab) throw new Error('clickTab missing tab');
            tab.click();
          }`);
          const deadline = Date.now() + 2000;
          while (Date.now() < deadline) {
            try {
              await runPlaywrightEval(`() => {
                const needle = new RegExp('${name}', 'i');
                const tab = Array.from(document.querySelectorAll('[role=\\'tab\\']')).find((el) => needle.test(el.textContent || ''));
                if (!tab) throw new Error('tab gone');
                if (tab.getAttribute('aria-selected') !== 'true') throw new Error('tab not yet selected');
              }`);
              return;
            } catch {
              await sleep(100);
            }
          }
        });
        context.actionCountRef.value += 1;
        return;
      }
      case 'pressEscape': {
        await runPlaywright(['press', 'Escape']);
        context.actionCountRef.value += 1;
        return;
      }
      default:
        throw new Error(`Unsupported demo action primitive "${actionName}".`);
    }
  }

  return {
    async openSession() {
      await runPlaywright(['open', 'about:blank']);
      await runPlaywright(['resize', '1366', '900']);
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
        await runAction(step, { sceneId: scene.id, stepIndex: index, actionCountRef });
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
            message: error instanceof Error ? error.message : String(error)
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
        passedCheckpointCount: passedCheckpoints
      };
    }
  };
}
