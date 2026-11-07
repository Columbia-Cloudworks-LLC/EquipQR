/**
 * Self-contained gallery page for the screen catalog. All data is embedded as
 * JSON and rendered client-side with textContent (never innerHTML of data).
 */
import type { GalleryFlow } from './gallery-model';
import { screenContextMarkdown } from './gallery-model';

export interface GalleryMeta {
  device: string;
  clock: string;
  builtAt: string;
  absoluteRoot: string;
  vscodePrefix: string;
  repoRoot: string;
}

export function renderGalleryHtml(model: GalleryFlow[], meta: GalleryMeta): string {
  const contexts: Record<string, { full: string; brief: string }> = {};
  for (const flow of model) {
    for (const lane of flow.lanes) {
      for (const frame of lane.frames) {
        if (!frame.capture) continue;
        contexts[frame.key] = {
          full: screenContextMarkdown(frame.capture, { absoluteRoot: meta.absoluteRoot }),
          brief: screenContextMarkdown(frame.capture, { absoluteRoot: meta.absoluteRoot, includeText: false }),
        };
      }
    }
  }
  const data = JSON.stringify({ meta, flows: model, contexts }).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>EquipQR Screen Catalog</title>
<style>
:root {
  --bg: #1b1b1d; --canvas: #232326; --panel: #2b2b2f; --panel-2: #333338; --line: #3d3d43;
  --text: #ececf0; --muted: #a1a1aa; --accent: #8b5cf6; --accent-ink: #f5f3ff;
  --ok: #34d399; --warn: #fbbf24; --err: #f87171; --frame-w: 220px;
  --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  --sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color-scheme: dark;
}
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; background: var(--bg); color: var(--text); font: 14px/1.45 var(--sans); }
button, input { font: inherit; color: inherit; }
button { cursor: pointer; }
a { color: #c4b5fd; }
.app { display: grid; grid-template-columns: 260px 1fr; grid-template-rows: auto 1fr; height: 100vh; }
header { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 12px 16px; align-items: center; padding: 10px 16px; border-bottom: 1px solid var(--line); background: var(--panel); }
header h1 { font-size: 15px; margin: 0; font-weight: 650; letter-spacing: .01em; }
.meta { color: var(--muted); font-size: 12px; }
.spacer { flex: 1; }
.search { background: var(--bg); border: 1px solid var(--line); border-radius: 6px; padding: 6px 10px; width: 220px; }
.seg { display: inline-flex; border: 1px solid var(--line); border-radius: 6px; overflow: hidden; }
.seg button { background: transparent; border: 0; padding: 5px 10px; color: var(--muted); }
.seg button[aria-pressed="true"] { background: var(--accent); color: var(--accent-ink); }
.toggle { display: inline-flex; gap: 6px; align-items: center; color: var(--muted); font-size: 13px; }
.zoom { display: inline-flex; gap: 6px; align-items: center; color: var(--muted); font-size: 12px; }
nav.sidebar { overflow-y: auto; border-right: 1px solid var(--line); background: var(--panel); padding: 8px 0 24px; }
.area { padding: 12px 16px 4px; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); }
.navlink { display: flex; justify-content: space-between; gap: 8px; padding: 5px 16px; color: var(--text); text-decoration: none; font-size: 13px; }
.navlink:hover { background: var(--panel-2); }
.navlink .count { color: var(--muted); font-variant-numeric: tabular-nums; }
.navlink .count.bad { color: var(--err); }
main.canvas { overflow: auto; background: var(--canvas); background-image: radial-gradient(#ffffff0d 1px, transparent 1px); background-size: 20px 20px; padding: 24px 32px 120px; }
.board { margin-bottom: 56px; }
.board-head { position: sticky; left: 0; max-width: 900px; margin-bottom: 14px; }
.board-head .crumb { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
.board-head h2 { margin: 2px 0 4px; font-size: 20px; }
.board-head p { margin: 0; color: var(--muted); }
.lane { margin: 18px 0 0; }
.lane-label { position: sticky; left: 0; display: inline-block; font-size: 12px; color: var(--muted); margin-bottom: 8px; padding: 2px 8px; border: 1px solid var(--line); border-radius: 999px; background: var(--panel); }
.frames { display: flex; gap: 28px; align-items: flex-start; }
.frame { flex: 0 0 var(--frame-w); width: var(--frame-w); background: none; border: 0; padding: 0; text-align: left; }
.frame-title { display: flex; gap: 6px; align-items: baseline; font-size: 12px; margin-bottom: 6px; color: var(--muted); min-height: 34px; }
.frame-title b { color: var(--text); font-weight: 600; }
.badge { font-size: 10px; padding: 1px 6px; border-radius: 999px; border: 1px solid var(--line); color: var(--muted); white-space: nowrap; }
.badge.err { color: var(--err); border-color: #f8717166; }
.badge.warn { color: var(--warn); border-color: #fbbf2466; }
.slices { display: flex; flex-direction: column; gap: 6px; border-radius: 10px; outline: 2px solid transparent; outline-offset: 4px; }
.frame:hover .slices, .frame:focus-visible .slices { outline-color: var(--accent); }
.frame.active .slices { outline-color: var(--accent); }
.slices img { display: block; width: 100%; height: auto; border-radius: 8px; background: #000; box-shadow: 0 1px 0 #ffffff14, 0 6px 18px #0006; }
.placeholder { aspect-ratio: 412 / 839; border: 1px dashed var(--line); border-radius: 8px; display: grid; place-items: center; color: var(--muted); font-size: 12px; text-align: center; padding: 12px; }
aside.inspector { position: fixed; top: 0; right: 0; bottom: 0; width: min(620px, 100vw); background: var(--panel); border-left: 1px solid var(--line); box-shadow: -12px 0 32px #0008; transform: translateX(105%); transition: transform .15s ease; display: flex; flex-direction: column; z-index: 10; }
aside.inspector.open { transform: none; }
.insp-head { padding: 14px 18px 10px; border-bottom: 1px solid var(--line); }
.insp-head .crumb { color: var(--muted); font-size: 12px; }
.insp-head h3 { margin: 2px 0 6px; font-size: 18px; }
.insp-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.btn { background: var(--panel-2); border: 1px solid var(--line); border-radius: 6px; padding: 5px 10px; font-size: 12.5px; }
.btn:hover { border-color: var(--accent); }
.btn.primary { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
.insp-body { overflow-y: auto; padding: 12px 18px 40px; }
.insp-body h4 { margin: 18px 0 6px; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); }
.kv { display: grid; grid-template-columns: 110px 1fr; gap: 4px 10px; font-size: 13px; }
.kv dt { color: var(--muted); }
.kv dd { margin: 0; word-break: break-word; }
code, pre { font-family: var(--mono); font-size: 12px; }
pre { background: var(--bg); border: 1px solid var(--line); border-radius: 6px; padding: 10px; white-space: pre-wrap; word-break: break-word; max-height: 360px; overflow: auto; margin: 0; }
ol, ul { margin: 0; padding-left: 20px; }
.notice { border: 1px solid; border-radius: 6px; padding: 8px 10px; font-size: 13px; margin-top: 8px; }
.notice.err { border-color: #f8717166; color: #fecaca; background: #f871711a; }
.notice.warn { border-color: #fbbf2466; color: #fde68a; background: #fbbf241a; }
.notice.info { border-color: var(--line); color: var(--muted); background: var(--bg); }
.big-slices { display: grid; gap: 14px; }
.big-slice figure { margin: 0; }
.big-slice img { width: 100%; max-width: 412px; display: block; border-radius: 8px; border: 1px solid var(--line); }
.big-slice figcaption { display: flex; gap: 6px; align-items: center; margin-top: 6px; color: var(--muted); font-size: 12px; flex-wrap: wrap; }
.tabs { display: flex; gap: 4px; margin: 18px 0 8px; }
.tabs button { background: none; border: 1px solid transparent; border-radius: 6px; padding: 4px 10px; color: var(--muted); }
.tabs button[aria-selected="true"] { border-color: var(--line); background: var(--panel-2); color: var(--text); }
.toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: var(--text); color: var(--bg); padding: 8px 14px; border-radius: 8px; font-size: 13px; opacity: 0; pointer-events: none; transition: opacity .15s; z-index: 20; max-width: 90vw; }
.toast.show { opacity: 1; }
.empty { color: var(--muted); padding: 40px; }
@media (max-width: 760px) {
  .app { grid-template-columns: 1fr; }
  nav.sidebar { display: none; }
  .search { width: 100%; }
  main.canvas { padding: 16px; }
}
</style>
</head>
<body>
<div class="app">
  <header>
    <h1>EquipQR Screen Catalog</h1>
    <span class="meta" id="meta"></span>
    <span class="spacer"></span>
    <input class="search" id="search" type="search" placeholder="Search screens, routes, text…" aria-label="Search screens">
    <div class="seg" id="personas" role="group" aria-label="Persona filter"></div>
    <label class="toggle"><input type="checkbox" id="issues"> Issues only</label>
    <label class="zoom">Zoom <input type="range" id="zoom" min="140" max="412" step="4" value="220" aria-label="Frame width"></label>
  </header>
  <nav class="sidebar" id="sidebar" aria-label="Flows"></nav>
  <main class="canvas" id="canvas"></main>
</div>
<aside class="inspector" id="inspector" aria-label="Screen details" aria-hidden="true"></aside>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script type="application/json" id="catalog-data">${data}</script>
<script>
(() => {
  const DATA = JSON.parse(document.getElementById('catalog-data').textContent);
  const { meta, flows, contexts } = DATA;
  const state = { persona: 'all', query: '', issuesOnly: false, activeKey: null, visible: [] };
  try {
    const saved = JSON.parse(localStorage.getItem('screen-catalog:prefs') || '{}');
    if (saved.zoom) document.getElementById('zoom').value = saved.zoom;
    if (saved.persona) state.persona = saved.persona;
  } catch {}

  const el = (tag, attrs = {}, ...children) => {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value == null || value === false) continue;
      if (key === 'class') node.className = value;
      else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value === true ? '' : value);
    }
    for (const child of children.flat()) {
      if (child == null || child === false) continue;
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return node;
  };
  const pad = (n) => String(n).padStart(2, '0');
  const hasIssues = (c) => c && (c.status === 'error' || c.warnings.length || c.consoleErrors.length);

  const allFrames = flows.flatMap((flow) => flow.lanes.flatMap((lane) => lane.frames.map((frame) => ({ flow, lane, frame }))));
  const captures = allFrames.filter((f) => f.frame.capture);
  const errors = captures.filter((f) => f.frame.capture.status === 'error').length;
  const sliceCount = captures.reduce((n, f) => n + f.frame.capture.slices.length, 0);
  document.getElementById('meta').textContent =
    meta.device + ' · clock ' + meta.clock.replace('.000Z', 'Z') + ' · ' + captures.length + ' screens · ' + sliceCount + ' slices' + (errors ? ' · ' + errors + ' failed' : '');

  const personaOrder = [];
  for (const f of allFrames) if (!personaOrder.includes(f.lane.persona)) personaOrder.push(f.lane.persona);
  const personaNames = { all: 'All', owner: 'Owner', technician: 'Technician', anonymous: 'Logged out' };
  const seg = document.getElementById('personas');
  for (const persona of ['all', ...personaOrder]) {
    seg.append(el('button', { type: 'button', 'data-persona': persona, 'aria-pressed': String(state.persona === persona), onclick: () => {
      state.persona = persona; savePrefs();
      seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.persona === persona)));
      render();
    } }, personaNames[persona] || persona));
  }

  const matches = (flow, lane, frame) => {
    if (state.persona !== 'all' && lane.persona !== state.persona) return false;
    if (state.issuesOnly && !hasIssues(frame.capture) && frame.capture) return false;
    if (!state.query) return true;
    const q = state.query.toLowerCase();
    const c = frame.capture;
    return [flow.title, flow.area, frame.title, frame.description, frame.route, c && c.visibleText, c && c.sources.join(' ')]
      .some((v) => v && v.toLowerCase().includes(q));
  };

  function frameNode(flow, lane, frame) {
    const c = frame.capture;
    const badges = [];
    if (!c) badges.push(el('span', { class: 'badge warn' }, 'not captured'));
    else {
      if (c.status === 'error') badges.push(el('span', { class: 'badge err' }, 'failed'));
      if (c.consoleErrors.length) badges.push(el('span', { class: 'badge warn', title: 'Console errors during capture' }, c.consoleErrors.length + ' console'));
      if (c.slices.length > 1) badges.push(el('span', { class: 'badge' }, c.slices.length + ' slices'));
    }
    const slices = c && c.slices.length
      ? el('div', { class: 'slices' }, c.slices.map((s) => el('img', { src: s.file, alt: frame.title + ', slice ' + s.index, loading: 'lazy', decoding: 'async', width: '412', height: '839' })))
      : el('div', { class: 'slices' }, el('div', { class: 'placeholder' }, c ? 'No screenshot' : 'In the manifest but not captured in this run'));
    return el('button', { type: 'button', class: 'frame' + (state.activeKey === frame.key ? ' active' : ''), 'data-key': frame.key, onclick: () => openInspector(frame.key) },
      el('div', { class: 'frame-title' }, el('span', {}, pad(frame.order)), el('b', {}, frame.title), ...badges),
      slices);
  }

  function render() {
    const canvas = document.getElementById('canvas');
    const sidebar = document.getElementById('sidebar');
    canvas.replaceChildren();
    sidebar.replaceChildren();
    state.visible = [];
    let lastArea = null;
    for (const flow of flows) {
      const lanes = flow.lanes
        .map((lane) => ({ lane, frames: lane.frames.filter((frame) => matches(flow, lane, frame)) }))
        .filter((l) => l.frames.length);
      if (!lanes.length) continue;
      if (flow.area !== lastArea) { sidebar.append(el('div', { class: 'area' }, flow.area)); lastArea = flow.area; }
      const total = lanes.reduce((n, l) => n + l.frames.length, 0);
      const failed = lanes.reduce((n, l) => n + l.frames.filter((f) => f.capture && f.capture.status === 'error').length, 0);
      sidebar.append(el('a', { class: 'navlink', href: '#flow-' + flow.id }, el('span', {}, flow.title),
        el('span', { class: 'count' + (failed ? ' bad' : '') }, failed ? failed + '✕ ' + total : String(total))));
      const board = el('section', { class: 'board', id: 'flow-' + flow.id, 'aria-labelledby': 'h-' + flow.id },
        el('div', { class: 'board-head' }, el('div', { class: 'crumb' }, flow.area), el('h2', { id: 'h-' + flow.id }, flow.title), el('p', {}, flow.description)));
      for (const { lane, frames } of lanes) {
        frames.forEach((frame) => state.visible.push(frame.key));
        board.append(el('div', { class: 'lane' }, el('div', { class: 'lane-label' }, lane.personaLabel),
          el('div', { class: 'frames' }, frames.map((frame) => frameNode(flow, lane, frame)))));
      }
      canvas.append(board);
    }
    if (!canvas.children.length) canvas.append(el('p', { class: 'empty' }, 'No screens match the current filters.'));
  }

  const toastNode = document.getElementById('toast');
  let toastTimer;
  function toast(message) {
    toastNode.textContent = message; toastNode.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toastNode.classList.remove('show'), 2200);
  }
  async function copyText(text, label) {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = el('textarea'); ta.value = text; document.body.append(ta); ta.select();
      document.execCommand('copy'); ta.remove();
    }
    toast(label || 'Copied');
  }
  async function copyImage(src, absPath) {
    try {
      const blob = await (await fetch(src)).blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      toast('Image copied');
    } catch {
      await copyText(absPath, 'Copying images needs npm run screens:serve. Copied the file path instead.');
    }
  }

  const findFrame = (key) => allFrames.find((f) => f.frame.key === key);

  function openInspector(key) {
    const found = findFrame(key);
    if (!found) return;
    const { flow, lane, frame } = found;
    const c = frame.capture;
    state.activeKey = key;
    document.querySelectorAll('.frame.active').forEach((n) => n.classList.remove('active'));
    const frameEl = document.querySelector('.frame[data-key="' + CSS.escape(key) + '"]');
    if (frameEl) { frameEl.classList.add('active'); frameEl.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
    if (location.hash !== '#' + key) history.replaceState(null, '', '#' + key);

    const insp = document.getElementById('inspector');
    const ctx = contexts[key];
    const abs = (file) => meta.absoluteRoot + '/' + file;
    const issueBody = () => '<!-- Attach the slice PNGs listed below -->\\n\\n' + ctx.brief;
    const issueTitle = '[Mobile UI] ' + flow.title + ' › ' + frame.title + ' (' + lane.personaLabel + ')';

    const head = el('div', { class: 'insp-head' },
      el('div', { class: 'crumb' }, flow.area + ' › ' + flow.title + ' · ' + lane.personaLabel),
      el('h3', {}, pad(frame.order) + ' ' + frame.title),
      el('div', {}, frame.description),
      el('div', { class: 'insp-actions' },
        c && el('button', { class: 'btn primary', type: 'button', onclick: () => copyText(ctx.full, 'Full context copied (paste into Claude)') }, 'Copy context for Claude'),
        c && el('button', { class: 'btn', type: 'button', onclick: () => copyText(ctx.brief, 'Brief context copied') }, 'Copy brief context'),
        c && el('button', { class: 'btn', type: 'button', onclick: () => copyText('## ' + issueTitle + '\\n\\n' + issueBody(), 'Issue markdown copied') }, 'Copy as GitHub issue'),
        c && el('button', { class: 'btn', type: 'button', onclick: () => copyText(meta.absoluteRoot + '/' + c.dir + '/context.md', 'context.md path copied') }, 'Copy context.md path'),
        el('button', { class: 'btn', type: 'button', onclick: () => copyText(location.href.split('#')[0] + '#' + key, 'Link copied') }, 'Copy link'),
        el('button', { class: 'btn', type: 'button', onclick: closeInspector, 'aria-label': 'Close details' }, 'Close ✕')));

    const body = el('div', { class: 'insp-body' });
    if (!c) {
      body.append(el('div', { class: 'notice warn' }, 'This screen is in the manifest but was not captured in this run (filtered out, or the run stopped early).'),
        el('h4', {}, 'Route'), el('code', {}, frame.route));
    } else {
      if (c.status === 'error') body.append(el('div', { class: 'notice err' }, el('b', {}, 'Capture failed: '), el('pre', {}, c.error || '')));
      for (const w of c.warnings) body.append(el('div', { class: 'notice warn' }, w));
      for (const n of c.notes || []) body.append(el('div', { class: 'notice info' }, n));
      body.append(el('h4', {}, 'Where'), el('dl', { class: 'kv' },
        el('dt', {}, 'Route'), el('dd', {}, el('code', {}, c.route)),
        c.finalUrl && c.finalUrl !== c.route && [el('dt', {}, 'Landed on'), el('dd', {}, el('code', {}, c.finalUrl))],
        el('dt', {}, 'Persona'), el('dd', {}, c.personaLabel),
        el('dt', {}, 'Device'), el('dd', {}, c.device + ' · ' + c.viewport.width + '×' + c.viewport.height + ' @' + c.viewport.deviceScaleFactor + 'x'),
        el('dt', {}, 'Capture'), el('dd', {}, c.captureMode + ' · ' + c.scroll.container + ' · ' + c.slices.length + ' slice(s)'),
        el('dt', {}, 'Page title'), el('dd', {}, c.pageTitle || '—')));
      body.append(el('h4', {}, 'How to reach it'), el('ol', {}, c.howToReach.map((s) => el('li', {}, s))));
      body.append(el('h4', {}, 'Source files'), el('ul', {}, c.sources.map((s) =>
        el('li', {}, el('a', { href: meta.vscodePrefix + meta.repoRoot + '/' + s, title: 'Open in VS Code' }, s)))));
      if (c.consoleErrors.length) body.append(el('h4', {}, 'Console errors'), el('pre', {}, [...new Set(c.consoleErrors)].join('\\n')));
      if (c.failedRequests.length) body.append(el('h4', {}, 'Failed requests'), el('pre', {}, [...new Set(c.failedRequests)].join('\\n')));
      body.append(el('h4', {}, 'Screenshots'), el('div', { class: 'big-slices' }, c.slices.map((s) =>
        el('div', { class: 'big-slice' }, el('figure', {},
          el('a', { href: s.file, target: '_blank', rel: 'noopener' }, el('img', { src: s.file, alt: frame.title + ', slice ' + s.index, loading: 'lazy' })),
          el('figcaption', {}, 'Slice ' + s.index + ' · scrollTop ' + s.scrollTop + 'px',
            el('button', { class: 'btn', type: 'button', onclick: () => copyImage(s.file, abs(s.file)) }, 'Copy image'),
            el('button', { class: 'btn', type: 'button', onclick: () => copyText(abs(s.file), 'Path copied') }, 'Copy path')))))));
      const textPre = el('pre', {}, c.visibleText || '(no text)');
      const ariaPre = el('pre', { hidden: true }, c.ariaSnapshot || '(none)');
      const headPre = el('pre', { hidden: true }, c.headings.join('\\n') || '(none)');
      const panes = { text: textPre, aria: ariaPre, headings: headPre };
      const tabs = el('div', { class: 'tabs', role: 'tablist' }, Object.entries({ text: 'Rendered text', aria: 'Accessibility tree', headings: 'Headings' }).map(([id, label], i) =>
        el('button', { type: 'button', role: 'tab', 'aria-selected': String(i === 0), onclick: (e) => {
          tabs.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', 'false'));
          e.currentTarget.setAttribute('aria-selected', 'true');
          Object.entries(panes).forEach(([pid, pane]) => { pane.hidden = pid !== id; });
        } }, label)));
      body.append(tabs, textPre, ariaPre, headPre);
    }
    insp.replaceChildren(head, body);
    insp.classList.add('open');
    insp.setAttribute('aria-hidden', 'false');
  }

  function closeInspector() {
    const insp = document.getElementById('inspector');
    insp.classList.remove('open'); insp.setAttribute('aria-hidden', 'true');
    document.querySelectorAll('.frame.active').forEach((n) => n.classList.remove('active'));
    state.activeKey = null;
    history.replaceState(null, '', location.pathname + location.search);
  }

  function savePrefs() {
    try { localStorage.setItem('screen-catalog:prefs', JSON.stringify({ zoom: document.getElementById('zoom').value, persona: state.persona })); } catch {}
  }
  const zoom = document.getElementById('zoom');
  const applyZoom = () => document.documentElement.style.setProperty('--frame-w', zoom.value + 'px');
  zoom.addEventListener('input', () => { applyZoom(); savePrefs(); });
  applyZoom();
  let searchTimer;
  document.getElementById('search').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.query = e.target.value.trim(); render(); }, 120);
  });
  document.getElementById('issues').addEventListener('change', (e) => { state.issuesOnly = e.target.checked; render(); });
  document.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement) return;
    if (e.key === 'Escape') closeInspector();
    if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && state.activeKey) {
      const i = state.visible.indexOf(state.activeKey);
      const next = state.visible[i + (e.key === 'ArrowRight' ? 1 : -1)];
      if (next) { e.preventDefault(); openInspector(next); }
    }
    if (e.key === '/') { e.preventDefault(); document.getElementById('search').focus(); }
  });

  render();
  const followHash = () => {
    const target = decodeURIComponent(location.hash.slice(1));
    if (target && findFrame(target)) { if (target !== state.activeKey) openInspector(target); }
    else if (target.startsWith('flow-')) document.getElementById(target)?.scrollIntoView();
  };
  window.addEventListener('hashchange', followHash);
  followHash();
})();
</script>
</body>
</html>
`;
}
