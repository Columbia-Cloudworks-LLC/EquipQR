const DEMO_CUE_PAUSE_MS = 900;

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
 * @param {string} label
 */
function demoCuePrelude(label) {
  const safeLabel = jsString(label);
  return `
      const __equipqrDemoCue = async (element) => {
        const ringId = 'equipqr-demo-action-spotlight';
        const labelId = 'equipqr-demo-action-spotlight-label';
        document.getElementById(ringId)?.remove();
        document.getElementById(labelId)?.remove();
        element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
        await new Promise((resolve) => setTimeout(resolve, 250));
        const rect = element.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        const ring = document.createElement('div');
        ring.id = ringId;
        ring.setAttribute('aria-hidden', 'true');
        Object.assign(ring.style, {
          position: 'fixed',
          pointerEvents: 'none',
          zIndex: '2147483646',
          left: Math.max(8, rect.left - 8) + 'px',
          top: Math.max(8, rect.top - 8) + 'px',
          width: rect.width + 16 + 'px',
          height: rect.height + 16 + 'px',
          border: '4px solid #7B3EE7',
          borderRadius: '14px',
          boxShadow: '0 0 0 8px rgba(123, 62, 231, 0.18), 0 16px 45px rgba(15, 23, 42, 0.26)',
          background: 'rgba(123, 62, 231, 0.06)'
        });
        const caption = document.createElement('div');
        caption.id = labelId;
        caption.setAttribute('aria-hidden', 'true');
        caption.textContent = '${safeLabel}';
        Object.assign(caption.style, {
          position: 'fixed',
          pointerEvents: 'none',
          zIndex: '2147483647',
          left: Math.max(8, rect.left - 8) + 'px',
          top: Math.max(8, rect.top - 42) + 'px',
          maxWidth: 'min(520px, calc(100vw - 24px))',
          padding: '7px 10px',
          borderRadius: '999px',
          background: '#7B3EE7',
          color: 'white',
          font: '700 12px/1.25 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.26)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        });
        document.documentElement.append(ring, caption);
        window.setTimeout(() => {
          ring.remove();
          caption.remove();
        }, ${DEMO_CUE_PAUSE_MS + 1200});
        await new Promise((resolve) => setTimeout(resolve, ${DEMO_CUE_PAUSE_MS}));
      };
  `;
}

/**
 * @param {{
 *   baseUrl: string,
 *   diagnostics: {
 *     selectorFallbacks: Array<Record<string, unknown>>,
 *     sceneEvents: Array<Record<string, unknown>>
 *   },
 *   withRetries: (sceneId: string, stepIndex: number, step: Record<string, unknown>, fn: () => Promise<void>) => Promise<void>,
 *   recordSpotlight: (sceneId: string, stepIndex: number, action: string) => void,
 *   runPlaywright: (args: string[]) => Promise<string>,
 *   runPlaywrightEval: (script: string) => Promise<string>,
 *   sleep: (ms: number) => Promise<void>,
 *   buildRouteUrl: (baseUrl: string, route: string) => string,
 *   markerSeen: (output: string, marker: string) => boolean
 * }} deps
 */
export function createDemoStepActions(deps) {
  const {
    baseUrl,
    diagnostics,
    withRetries,
    recordSpotlight,
    runPlaywright,
    runPlaywrightEval,
    sleep,
    buildRouteUrl,
    markerSeen,
  } = deps;

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
    const script = `async () => {
      ${demoCuePrelude(`Click ${name}`)}
      const needle = new RegExp('${nameEscaped}', 'i');
      const byRole = Array.from(document.querySelectorAll('[role=\\'${roleEscaped}\\']')).find((el) => needle.test(el.textContent || '') && !el.hasAttribute('disabled'));
      if (byRole) {
        console.log('${markerPrimary}');
        await __equipqrDemoCue(byRole);
        byRole.click();
        return;
      }
      const selectors = ${fallbackJson};
      for (const selector of selectors) {
        const fallbackMatch = Array.from(document.querySelectorAll(selector)).find((el) => needle.test(el.textContent || '') && !el.hasAttribute('disabled'));
        if (fallbackMatch) {
          console.log('${markerFallback}:' + selector);
          await __equipqrDemoCue(fallbackMatch);
          fallbackMatch.click();
          return;
        }
      }
      throw new Error('Required element missing for role/name strategy');
    }`;

    try {
      const output = await runPlaywrightEval(script);
      recordSpotlight(context.sceneId, context.stepIndex, context.actionName);
      if (markerSeen(output, markerFallback)) {
        const used = output
          .split('\n')
          .find((line) => line.includes(`${markerFallback}:`))
          ?.split(`${markerFallback}:`)[1]
          ?.trim();
        diagnostics.selectorFallbacks.push({
          sceneId: context.sceneId,
          stepIndex: context.stepIndex,
          action: context.actionName,
          selector: used || 'unknown',
        });
      }
    } catch (error) {
      if (context.required === false) {
        diagnostics.sceneEvents.push({
          type: 'optional-step-skipped',
          sceneId: context.sceneId,
          stepIndex: context.stepIndex,
          action: context.actionName,
          reason: 'element-missing',
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
        `() => { if (!window.location.href.includes('${value}')) throw new Error('Checkpoint failed: urlIncludes'); }`,
      );
      return true;
    }

    if (checkpoint.type === 'textVisible') {
      const text = jsString(regexLiteral(String(checkpoint.text || checkpoint.value || '')));
      await runPlaywrightEval(
        `() => { const ok = Array.from(document.querySelectorAll('body *')).some((el) => new RegExp('${text}', 'i').test(el.textContent || '')); if (!ok) throw new Error('Checkpoint failed: textVisible'); }`,
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
        await runPlaywright(['goto', buildRouteUrl(baseUrl, route)]);
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
          actionName,
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
            `async () => { ${demoCuePrelude(`Click ${rawText}`)} const el = Array.from(document.querySelectorAll('${selector}')).find((node) => new RegExp('${text}', 'i').test(node.textContent || '') && !node.hasAttribute('disabled')); if (!el) throw new Error('clickText missing element'); await __equipqrDemoCue(el); el.click(); }`,
          );
        });
        recordSpotlight(context.sceneId, context.stepIndex, actionName);
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
          const output = await runPlaywrightEval(`async () => {
            ${demoCuePrelude(`Fill ${String(step.name || '')}`)}
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
            await __equipqrDemoCue(input);
            input.focus();
            input.value = '${value}';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }`);
          const fallbackLine = output
            .split('\n')
            .find((line) => line.includes('DEMO_SELECTOR_FALLBACK:'));
          if (fallbackLine) {
            diagnostics.selectorFallbacks.push({
              sceneId: context.sceneId,
              stepIndex: context.stepIndex,
              action: actionName,
              selector: fallbackLine.split('DEMO_SELECTOR_FALLBACK:')[1]?.trim() || 'unknown',
            });
          }
        });
        recordSpotlight(context.sceneId, context.stepIndex, actionName);
        context.actionCountRef.value += 1;
        return;
      }
      case 'selectOption': {
        const selector = jsString(String(step.selector || 'select'));
        const value = jsString(String(step.value || ''));
        await runPlaywrightEval(
          `async () => { ${demoCuePrelude(`Select ${String(step.value || '')}`)} const el = document.querySelector('${selector}'); if (!el) throw new Error('selectOption missing select'); await __equipqrDemoCue(el); el.value = '${value}'; el.dispatchEvent(new Event('change', { bubbles: true })); }`,
        );
        recordSpotlight(context.sceneId, context.stepIndex, actionName);
        context.actionCountRef.value += 1;
        return;
      }
      case 'openDrawer':
      case 'openMenu':
      case 'openDialog': {
        const selector = jsString(String(step.selector || 'button,[role="button"]'));
        await runPlaywrightEval(
          `async () => { ${demoCuePrelude(actionName.replace(/^open/i, 'Open '))} const el = document.querySelector('${selector}'); if (!el) throw new Error('open action missing selector'); await __equipqrDemoCue(el); el.click(); }`,
        );
        recordSpotlight(context.sceneId, context.stepIndex, actionName);
        context.actionCountRef.value += 1;
        return;
      }
      case 'safeClose': {
        await runPlaywright(['press', 'Escape']).catch(async () => {
          await runPlaywrightEval(
            `() => { const closeBtn = document.querySelector('[aria-label*=\\'close\\' i],button[title*=\\'close\\' i]'); if (closeBtn) closeBtn.click(); }`,
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
          `async () => { ${demoCuePrelude('Focus field')} const el = document.querySelector('${selector}'); if (!el) throw new Error('focusElement missing selector'); await __equipqrDemoCue(el); el.focus(); }`,
        );
        recordSpotlight(context.sceneId, context.stepIndex, actionName);
        context.actionCountRef.value += 1;
        return;
      }
      case 'hoverReveal': {
        const selector = jsString(String(step.selector || 'button,a,[role="button"]'));
        await runPlaywrightEval(
          `async () => { ${demoCuePrelude('Reveal actions')} const el = document.querySelector('${selector}'); if (!el) throw new Error('hoverReveal missing selector'); await __equipqrDemoCue(el); el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); }`,
        );
        recordSpotlight(context.sceneId, context.stepIndex, actionName);
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
          await runPlaywrightEval(`async () => {
            ${demoCuePrelude(`Click ${String(step.label || '')}`)}
            const needle = new RegExp('${label}', 'i');
            const el = Array.from(document.querySelectorAll('[aria-label]')).find((node) => needle.test(node.getAttribute('aria-label') || '') && !node.hasAttribute('disabled'));
            if (!el) throw new Error('clickByLabel missing element for label');
            await __equipqrDemoCue(el);
            el.click();
          }`);
        });
        recordSpotlight(context.sceneId, context.stepIndex, actionName);
        context.actionCountRef.value += 1;
        return;
      }
      case 'clickHiddenButton': {
        const label = jsString(regexLiteral(String(step.label || '')));
        const parentSelector = jsString(String(step.parentSelector || ''));
        if (!label) throw new Error('clickHiddenButton requires "label".');
        await withRetries(context.sceneId, context.stepIndex, step, async () => {
          await runPlaywrightEval(`async () => {
            ${demoCuePrelude(`Click ${String(step.label || '')}`)}
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
            await __equipqrDemoCue(button);
            button.click();
          }`);
        });
        recordSpotlight(context.sceneId, context.stepIndex, actionName);
        context.actionCountRef.value += 1;
        return;
      }
      case 'fillNumberInput': {
        const name = jsString(regexLiteral(String(step.name || step.label || '')));
        const value = jsString(String(step.value ?? ''));
        if (!name) throw new Error('fillNumberInput requires "name" or "label".');
        await withRetries(context.sceneId, context.stepIndex, step, async () => {
          await runPlaywrightEval(`async () => {
            ${demoCuePrelude(`Fill ${String(step.name || step.label || '')}`)}
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
            await __equipqrDemoCue(input);
            input.focus();
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            setter.call(input, '${value}');
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            input.blur();
          }`);
        });
        recordSpotlight(context.sceneId, context.stepIndex, actionName);
        context.actionCountRef.value += 1;
        return;
      }
      case 'clickTab': {
        const name = jsString(regexLiteral(String(step.name || '')));
        if (!name) throw new Error('clickTab requires "name".');
        await withRetries(context.sceneId, context.stepIndex, step, async () => {
          await runPlaywrightEval(`async () => {
            ${demoCuePrelude(`Open ${String(step.name || '')} tab`)}
            const needle = new RegExp('${name}', 'i');
            const tab = Array.from(document.querySelectorAll('[role=\\'tab\\']')).find((el) => needle.test(el.textContent || '') && !el.hasAttribute('disabled'));
            if (!tab) throw new Error('clickTab missing tab');
            await __equipqrDemoCue(tab);
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
        recordSpotlight(context.sceneId, context.stepIndex, actionName);
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

  return { runAction, verifyCheckpoint };
}
