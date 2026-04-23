#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT_DIR = __dirname;
const BS_ROOT = path.dirname(SCRIPT_DIR);
const REGISTRY_DIR = path.join(BS_ROOT, 'claude-hooks', 'scopes');
const GLOBAL_STATUS_DIR = path.join(os.homedir(), '.bridgespace', 'claude-hooks', 'global');

function listActiveScopes() {
  if (!fs.existsSync(REGISTRY_DIR)) return [];
  try {
    return fs.readdirSync(REGISTRY_DIR)
      .filter((name) => name.endsWith('.json'))
      .map((name) => name.replace(/\.json$/i, ''));
  } catch {
    return [];
  }
}

function readMarker(markerPath) {
  try {
    const content = fs.readFileSync(markerPath, 'utf8');
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch {
    // Ignore malformed markers and treat them as missing.
  }
  return null;
}

function resolveScopeContext() {
  const envScopeId = process.env.BRIDGESPACE_SWARM_SCOPE_ID || '';
  if (envScopeId) {
    const markerPath = path.join(REGISTRY_DIR, envScopeId + '.json');
    if (fs.existsSync(markerPath)) {
      const marker = readMarker(markerPath);
      if (marker && typeof marker.binDir === 'string') {
        return marker;
      }
    }
  }

  const activeScopes = listActiveScopes();
  if (activeScopes.length === 1) {
    const markerPath = path.join(REGISTRY_DIR, activeScopes[0] + '.json');
    const marker = readMarker(markerPath);
    if (marker && typeof marker.binDir === 'string') {
      return marker;
    }
  }

  return null;
}

function runNodeScript(scriptPath, args) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    stdio: 'inherit',
    env: process.env,
  });
  return typeof result.status === 'number' ? result.status : 0;
}

function dispatchMail(scope) {
  const mailScript = path.join(BS_ROOT, scope.binDir, 'bs-mail.cjs');
  if (!fs.existsSync(mailScript)) return 0;
  return runNodeScript(mailScript, ['check', '--inject']);
}

function dispatchStatus(scope, status, title, body) {
  const notifyScript = path.join(BS_ROOT, scope.binDir, 'bs-notify.cjs');
  if (!fs.existsSync(notifyScript)) return 0;
  return runNodeScript(notifyScript, [status, title, body]);
}

const event = (process.argv[2] || '').toLowerCase();
const status = process.argv[3] || '';
const title = process.argv[4] || '';
const body = process.argv[5] || '';
const scope = resolveScopeContext();

// Read Claude's hook stdin payload. UserPromptSubmit hooks receive JSON
// like { session_id, prompt, cwd, hook_event_name }. We pull the prompt out
// so the renderer can seed terminal-title generation with the user's actual
// first message instead of a stale shell command.
//
// stdin can be a pipe (spawn), socket, or character device depending on how
// the host invokes the hook — fstat-gating turned out to be too strict, so
// we just attempt the read and swallow EAGAIN/EWOULDBLOCK/EBADF.
function readStdinSync() {
  if (process.stdin.isTTY) return '';
  try {
    const buf = fs.readFileSync(0, 'utf8');
    return typeof buf === 'string' ? buf : '';
  } catch {
    return '';
  }
}

function pickUserPromptFromPayload(payload) {
  if (!payload || typeof payload !== 'object') return '';
  // Claude Code uses 'prompt'; other agents may use 'user_prompt' or 'message'.
  const keys = ['prompt', 'user_prompt', 'userPrompt', 'message', 'text'];
  for (const k of keys) {
    const v = payload[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

const stdinRaw = readStdinSync();
let stdinPayload = null;
if (stdinRaw) {
  try { stdinPayload = JSON.parse(stdinRaw); } catch { stdinPayload = null; }
}
const userPrompt = pickUserPromptFromPayload(stdinPayload);

// One-line debug breadcrumb when prompt extraction fails on a prompt-submit
// event. Helps diagnose host-specific stdin quirks without blowing up logs.
if (event === 'user-prompt-submit' && !userPrompt) {
  try {
    const debugDir = path.join(os.homedir(), '.bridgespace', 'logs');
    fs.mkdirSync(debugDir, { recursive: true });
    const stdinIsTTY = !!process.stdin.isTTY;
    let stdinKind = 'unknown';
    try {
      const st = fs.fstatSync(0);
      stdinKind = st.isFIFO() ? 'fifo' : st.isFile() ? 'file' : st.isCharacterDevice() ? 'char' : st.isSocket() ? 'socket' : 'other';
    } catch (e) {
      stdinKind = 'fstat-err:' + (e && e.code ? e.code : 'unknown');
    }
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      event: 'user-prompt-submit',
      stdinIsTTY,
      stdinKind,
      stdinLen: stdinRaw.length,
      stdinHead: stdinRaw.slice(0, 200),
    }) + '\n';
    fs.appendFileSync(path.join(debugDir, 'claude-hook-stdin-debug.log'), line);
  } catch {
    // Debug logging is best-effort.
  }
}

function writeGlobalStatus(eventName, statusValue, titleValue, bodyValue) {
  const sessionId = process.env.BRIDGESPACE_SESSION_ID || '';
  if (!sessionId) return; // Nothing to correlate — bail silently.

  try {
    fs.mkdirSync(GLOBAL_STATUS_DIR, { recursive: true });
  } catch {
    return;
  }

  const timestamp = Date.now();
  const payload = {
    sessionId,
    status: statusValue || (eventName === 'notification' ? 'needs-input' : 'idle'),
    title: titleValue || (eventName === 'notification' ? 'Needs input' : 'Finished working'),
    body: bodyValue || '',
    event: eventName,
    cwd: process.cwd(),
    pid: typeof process.pid === 'number' ? process.pid : null,
    timestamp,
    // Carry the user's prompt through to the renderer so it can seed
    // terminal-title generation. Truncated to 4KB to keep drop files small.
    userPrompt: userPrompt ? userPrompt.slice(0, 4000) : '',
  };

  // One file per event so that back-to-back events (e.g., Stop followed by
  // Notification a few ms later) don't overwrite each other before the
  // renderer's fs.watch handler has a chance to read them.
  // Filename: <sessionId>--<timestamp>-<event>.json
  const eventSlug = String(eventName).replace(/[^a-z0-9-]/gi, '').slice(0, 32) || 'event';
  const filename = sessionId + '--' + timestamp + '-' + eventSlug + '.json';
  const filePath = path.join(GLOBAL_STATUS_DIR, filename);
  const tmpPath = filePath + '.tmp';
  try {
    // Atomic write: write to a tmp path, then rename so watchers never see
    // a truncated JSON file mid-write.
    fs.writeFileSync(tmpPath, JSON.stringify(payload));
    fs.renameSync(tmpPath, filePath);
  } catch {
    // Best effort — do not let hook failures propagate to Claude.
  }
}

if (scope) {
  switch (event) {
    case 'user-prompt-submit':
      dispatchMail(scope);
      // Also write a global status file so the renderer can pick up the
      // userPrompt for title generation. The swarm dispatch above handles
      // mail injection but doesn't carry the prompt back to the renderer.
      if (userPrompt) writeGlobalStatus('user-prompt-submit', 'running', '', '');
      break;
    case 'stop':
      dispatchStatus(scope, status || 'idle', title || 'Finished working', body || '');
      break;
    case 'notification':
      dispatchStatus(scope, status || 'needs-input', title || 'Needs input', body || '');
      break;
    default:
      break;
  }
} else {
  // Fallback path for non-swarm Claude conversations: just record the status
  // write to the per-session global file. BridgeSpace's renderer watches this
  // directory and surfaces a notification.
  switch (event) {
    case 'stop':
      writeGlobalStatus('stop', status, title, body);
      break;
    case 'notification':
      writeGlobalStatus('notification', status, title, body);
      break;
    case 'user-prompt-submit':
      writeGlobalStatus('user-prompt-submit', status || 'running', title, body);
      break;
    default:
      break;
  }
}

process.exit(0);
