import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { parseEnv } from 'node:util';
import { setTimeout as sleep } from 'node:timers/promises';
import net from 'node:net';
import { seedMedia } from './seed-media.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const state = path.join(root, 'tmp/linux-stack');
const runtime = path.join(state, 'runtime');
const logs = path.join(state, 'logs');
const recordsPath = path.join(state, 'processes.json');
const cli = path.join(root, 'node_modules/.bin/supabase');
const project = 'equipqr-linux';
process.umask(0o077);
fs.mkdirSync(logs, { recursive: true });
const readEnv = file => fs.existsSync(file) ? parseEnv(fs.readFileSync(file, 'utf8')) : {};
const env = { ...process.env, ...readEnv(path.join(root, '.env')), ...readEnv(path.join(root, '.env.local')), ...process.env };
const backend = env.EQUIPQR_BACKEND || 'local';
if (!['local', 'hosted'].includes(backend)) throw new Error('EQUIPQR_BACKEND must be local or hosted.');
const hosted = backend === 'hosted';
const apiUrl = hosted ? env.EQUIPQR_DEV_SUPABASE_URL : 'http://127.0.0.1:54321';
if (hosted) {
  const url = new URL(apiUrl);
  if (url.protocol !== 'https:' || ['supabase.equipqr.app', 'ymxkzronkhwxzcdcbnwq.supabase.co'].includes(url.hostname)) {
    throw new Error('Hosted mode requires an explicit non-production HTTPS development backend.');
  }
  if (!env.EQUIPQR_DEV_SUPABASE_ANON_KEY) throw new Error('EQUIPQR_DEV_SUPABASE_ANON_KEY is required.');
}
const records = fs.existsSync(recordsPath) ? JSON.parse(fs.readFileSync(recordsPath, 'utf8')) : {};
const save = () => fs.writeFileSync(recordsPath, JSON.stringify(records, null, 2));

function run(command, args, log) {
  const fd = log ? fs.openSync(path.join(logs, log), 'a', 0o600) : null;
  try {
    const result = spawnSync(command, args, { cwd: root, env, stdio: fd === null ? 'inherit' : ['ignore', fd, fd] });
    if (result.error || result.status !== 0) throw new Error(`${path.basename(command)} failed${log ? `; see ${path.join(logs, log)}` : ''}`);
  } finally { if (fd !== null) fs.closeSync(fd); }
}
function supabase(args, log) { run(cli, [...args, '--workdir', runtime], log); }
function identity(pid) {
  try {
    const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
    const fields = stat.slice(stat.lastIndexOf(')') + 2).split(' ');
    if (fields[0] === 'Z') return null;
    return `${fs.readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim()}:${fields[19]}`;
  } catch { return null; }
}
function alive(record) { return Boolean(record?.identity && identity(record.pid) === record.identity); }
async function launch(name, command, args, extraEnv = {}) {
  if (alive(records[name])) return;
  const fd = fs.openSync(path.join(logs, `${name}.log`), 'a', 0o600);
  const child = spawn(command, args, { cwd: root, env: { ...env, ...extraEnv }, detached: true, stdio: ['ignore', fd, fd] });
  fs.closeSync(fd);
  await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
  records[name] = { pid: child.pid, identity: identity(child.pid) };
  child.unref();
  save();
}
async function stopProcesses() {
  for (const [name, record] of Object.entries(records)) {
    if (alive(record)) {
      process.kill(-record.pid, 'SIGTERM');
      for (let i = 0; i < 30 && alive(record); i++) await sleep(100);
      if (alive(record)) process.kill(-record.pid, 'SIGKILL');
    }
    delete records[name];
  }
  fs.rmSync(recordsPath, { force: true });
}
function prepare() {
  const dir = path.join(runtime, 'supabase');
  fs.mkdirSync(dir, { recursive: true });
  for (const entry of fs.readdirSync(path.join(root, 'supabase'), { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'config.toml') continue;
    const target = path.join(dir, entry.name);
    if (!fs.existsSync(target)) fs.symlinkSync(path.join(root, 'supabase', entry.name), target);
  }
  let config = fs.readFileSync(path.join(root, 'supabase/config.toml'), 'utf8');
  config = config.replace(/^project_id\s*=.*$/m, `project_id = "${project}"`);
  if (!env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID || !env.SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET) {
    config = config.replace(/(\[auth\.external\.google\][\s\S]*?)(?=\n\[|$)/, section => section.replace('enabled = true', 'enabled = false'));
    console.log('Google sign-in is disabled until development OAuth credentials are provided.');
  }
  fs.writeFileSync(path.join(dir, 'config.toml'), config);
  const edgeEnv = readEnv(path.join(root, 'supabase/functions/.env'));
  // Supabase injects its local URL and keys; never copy hosted credentials into the runtime.
  const entries = Object.entries(edgeEnv).filter(([key]) => !key.startsWith('SUPABASE_'));
  const values = Object.fromEntries(entries);
  values.APP_URL = 'http://localhost:8080';
  values.GW_OAUTH_REDIRECT_BASE_URL = 'http://localhost:54321';
  values.QBO_USE_SANDBOX = 'true';
  fs.writeFileSync(path.join(state, 'edge.env'), Object.entries(values).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join('\n') + '\n');
}
function keys() {
  if (hosted) return { ANON_KEY: env.EQUIPQR_DEV_SUPABASE_ANON_KEY };
  const result = spawnSync(cli, ['status', '--workdir', runtime, '-o', 'json'], { cwd: root, env, encoding: 'utf8' });
  if (result.status !== 0) throw new Error('Cannot read local Supabase status.');
  return JSON.parse(result.stdout);
}
function writePublicAppConfig(local) {
  const file = path.join(root, '.env.local');
  const entries = {
    VITE_SUPABASE_URL: hosted ? apiUrl : 'http://localhost:54321',
    VITE_SUPABASE_ANON_KEY: local.ANON_KEY,
  };
  // Open once and refuse symlinks; read/write the same inode under the lifecycle lock.
  const fd = fs.openSync(file, fs.constants.O_RDWR | fs.constants.O_CREAT | fs.constants.O_NOFOLLOW, 0o600);
  try {
    const previous = fs.readFileSync(fd, 'utf8');
    const lines = previous.split(/\r?\n/).filter(line => !/^\s*(?:export\s+)?VITE_SUPABASE_(URL|ANON_KEY)\s*=/.test(line));
    const content = [...lines, ...Object.entries(entries).map(([key, value]) => `${key}=${JSON.stringify(value)}`)].join('\n') + '\n';
    fs.fchmodSync(fd, 0o600);
    fs.writeSync(fd, content, 0, 'utf8');
    fs.ftruncateSync(fd, Buffer.byteLength(content));
  } finally { fs.closeSync(fd); }
}
async function probe(url, headers = {}) {
  try { const res = await fetch(url, { headers, signal: AbortSignal.timeout(7000) }); return res.ok; } catch { return false; }
}
async function waitFor(name, url, headers = {}, timeout = 120000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await probe(url, headers)) { console.log(`OK ${name}`); return; }
    await sleep(1500);
  }
  throw new Error(`${name} did not become ready; inspect ${logs}`);
}
async function portFree(port) {
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', () => reject(new Error(`Port ${port} is occupied. Stop the existing service first.`)));
    server.listen(port, '0.0.0.0', () => server.close(resolve));
  });
}
async function status() {
  const local = keys();
  const checks = [
    ['App', 'http://localhost:8080'], ['Docs', 'http://localhost:5174'],
    ['Auth', `${apiUrl}/auth/v1/health`],
    ['Edge + database', `${apiUrl}/functions/v1/healthcheck`],
  ];
  let ok = true;
  for (const [name, url] of checks) {
    const healthy = await probe(url, { apikey: local.ANON_KEY });
    console.log(`${healthy ? 'OK' : 'FAIL'} ${name}`);
    ok &&= healthy;
  }
  return ok;
}
async function start(reset = false) {
  if (hosted && reset) throw new Error('Reset is local-only; hosted development data is never reset by this launcher.');
  if (!hosted) run('docker', ['info'], 'docker.log');
  if (reset) await stopProcesses();
  for (const [name, port] of [['app', 8080], ['docs', 5174]]) if (!alive(records[name])) await portFree(port);
  if (!hosted) {
    prepare();
    if (!fs.existsSync(path.join(root, 'supabase/seeds/generated')) || reset) run('npm', ['run', 'seed:generate'], 'seed.log');
    console.log('Starting local Supabase (first launch downloads container images).');
    supabase(['start'], 'supabase.log');
    if (reset) {
      fs.rmSync(path.join(state, 'media-seeded'), { force: true });
      supabase(['db', 'reset', '--local', '--yes'], 'supabase.log');
    } else {
      // Existing volumes survive branch updates; apply forward migrations before
      // announcing readiness so a checkout does not silently use an old schema.
      supabase(['migration', 'up', '--local'], 'supabase.log');
    }
  }
  const local = keys();
  if (!local.ANON_KEY) throw new Error('API key is missing.');
  // Standard Vite builds use the same explicit development backend as startup.
  // Persist only the public URL/key, never service-role keys or login passwords.
  writePublicAppConfig(local);
  if (!hosted) {
    if (!local.SERVICE_ROLE_KEY) throw new Error('Local service key is missing.');
    const mediaMarker = path.join(state, 'media-seeded');
    if (reset || !fs.existsSync(mediaMarker)) {
      await seedMedia(root, local);
      fs.writeFileSync(mediaMarker, new Date().toISOString());
    }
    await launch('edge', cli, ['functions', 'serve', '--workdir', runtime, '--env-file', path.join(state, 'edge.env')]);
  }
  await waitFor('Edge + database', `${apiUrl}/functions/v1/healthcheck`, { apikey: local.ANON_KEY }, 180000);
  await launch('app', process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), '--host', '0.0.0.0', '--port', '8080', '--strictPort'], {
    VITE_SUPABASE_URL: hosted ? apiUrl : 'http://localhost:54321', VITE_SUPABASE_ANON_KEY: local.ANON_KEY,
    VITE_DEV_TEST_PASSWORD: hosted ? (env.VITE_DEV_TEST_PASSWORD || env.DEV_LOGIN_PASSWORD || '') : 'password123',
  });
  await launch('docs', 'npm', ['--prefix', 'docs', 'run', 'docs:dev', '--', '--strictPort']);
  await waitFor('App', 'http://localhost:8080');
  await waitFor('Docs', 'http://localhost:5174');
  if (!await status()) throw new Error('Stack health check failed.');
  console.log(`Logs: ${logs}`);
  console.log(hosted ? 'Using the configured hosted development backend.' : 'Local test login: owner@apex.test / password123');
}

try {
  const action = process.argv[2] || 'start';
  if (process.argv.length > 3) throw new Error('Expected one action: start | stop | status | reset');
  switch (action) {
    case 'local-check':
      if (hosted) throw new Error('Fixture suites and database commands require the disposable local backend.');
      break;
    case 'test-db':
      if (hosted) throw new Error('Database tests require the disposable local backend.');
      prepare();
      supabase(['test', 'db']);
      break;
    case 'start': await start(); break;
    case 'reset': await start(true); break;
    case 'stop':
      await stopProcesses();
      if (!hosted && fs.existsSync(path.join(runtime, 'supabase/config.toml'))) supabase(['stop'], 'supabase.log');
      console.log(hosted ? 'Local frontend processes stopped; hosted backend unchanged.' : 'Stack stopped; database volumes retained.');
      break;
    case 'status': if (!await status()) process.exitCode = 1; break;
    default: throw new Error('Usage: bash dev/linux/dev.sh start | stop | status | reset');
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
