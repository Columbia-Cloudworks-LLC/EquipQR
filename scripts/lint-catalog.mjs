import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TARGET_KINDS = new Set(['node-cli', 'npx', 'external-bin', 'pwsh-module']);
const CONTRACT_KINDS = new Set(['exit-code', 'fallow-unused', 'fallow-dupes']);
const TOOLS_CACHE = path.join('tmp', 'lint-tools');
const DOWNLOAD_MAX_SECONDS = 60;

const repoRootFromModule = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @param {string} value */
function psQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

/** @param {unknown} value */
function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** @param {unknown} value */
function assertStringArray(value, label) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`${label} must be a string array`);
  }
}

/** @param {unknown} match */
function parseMatch(match) {
  if (!isPlainObject(match) || (match.kind !== 'never' && match.kind !== 'when')) {
    throw new Error('match.kind must be never or when');
  }
  if (match.kind === 'never') {
    return { kind: 'never' };
  }
  assertStringArray(match.extensions, 'match.extensions');
  if (match.extensions.length === 0) {
    throw new Error('match.extensions must not be empty');
  }
  /** @type {{ kind: 'when'; extensions: string[]; excludeSuffixes?: string[]; under?: string }} */
  const parsed = { kind: 'when', extensions: match.extensions };
  if (match.excludeSuffixes !== undefined) {
    assertStringArray(match.excludeSuffixes, 'match.excludeSuffixes');
    parsed.excludeSuffixes = match.excludeSuffixes;
  }
  if (match.under !== undefined) {
    if (typeof match.under !== 'string' || match.under.length === 0) {
      throw new Error('match.under must be a non-empty string');
    }
    parsed.under = match.under;
  }
  return parsed;
}

/**
 * @param {unknown} hook
 * @param {string} id
 */
function parseHook(hook, id) {
  if (hook === null) {
    return null;
  }
  if (!isPlainObject(hook)) {
    throw new Error(`${id}: hook must be null or an object`);
  }
  if (hook.failClosed !== true) {
    throw new Error(`${id}: hook.failClosed must be true`);
  }
  if (hook.missingTool !== 'block' && hook.missingTool !== 'skip') {
    throw new Error(`${id}: hook.missingTool must be block or skip`);
  }
  assertStringArray(hook.argv, `${id}: hook.argv`);
  if (typeof hook.maxOutputLines !== 'number' || hook.maxOutputLines < 1) {
    throw new Error(`${id}: hook.maxOutputLines must be a positive number`);
  }
  return {
    failClosed: true,
    missingTool: hook.missingTool,
    argv: hook.argv,
    maxOutputLines: hook.maxOutputLines,
  };
}

/**
 * @param {unknown} contract
 * @param {string} id
 */
function parseContract(contract, id) {
  if (!isPlainObject(contract) || typeof contract.kind !== 'string' || !CONTRACT_KINDS.has(contract.kind)) {
    throw new Error(`${id}: unknown contract kind`);
  }
  if (contract.kind === 'exit-code') {
    return { kind: 'exit-code' };
  }
  if (contract.kind === 'fallow-unused') {
    if (contract.maxIssues !== 0) {
      throw new Error(`${id}: fallow-unused.maxIssues must be 0`);
    }
    return { kind: 'fallow-unused', maxIssues: 0 };
  }
  if (contract.maxCloneGroups !== 0) {
    throw new Error(`${id}: fallow-dupes.maxCloneGroups must be 0`);
  }
  return { kind: 'fallow-dupes', maxCloneGroups: 0 };
}

/**
 * @param {unknown} row
 */
function parseTarget(row) {
  if (!isPlainObject(row) || typeof row.id !== 'string' || row.id.length === 0) {
    throw new Error('target.id is required');
  }
  const { id } = row;
  if (typeof row.kind !== 'string' || !TARGET_KINDS.has(row.kind)) {
    throw new Error(`${id}: unknown kind ${String(row.kind)}`);
  }
  const match = parseMatch(row.match);
  const hook = parseHook(row.hook, id);
  if (match.kind === 'never' && hook !== null) {
    throw new Error(`${id}: match.kind never cannot have a non-null hook`);
  }
  if (!isPlainObject(row.batch) || !Array.isArray(row.batch.steps) || row.batch.steps.length === 0) {
    throw new Error(`${id}: batch.steps must be a non-empty array`);
  }
  const steps = row.batch.steps.map((step, index) => {
    if (!isPlainObject(step)) {
      throw new Error(`${id}: batch.steps[${index}] must be an object`);
    }
    assertStringArray(step.argv, `${id}: batch.steps[${index}].argv`);
    return { argv: step.argv, contract: parseContract(step.contract, id) };
  });
  const batch = { steps };

  if (row.kind === 'node-cli') {
    if (typeof row.bin !== 'string' || row.bin.length === 0) {
      throw new Error(`${id}: node-cli requires bin`);
    }
    return { id, kind: 'node-cli', bin: row.bin, match, hook, batch };
  }
  if (row.kind === 'npx') {
    if (typeof row.package !== 'string' || row.package.length === 0) {
      throw new Error(`${id}: npx requires package`);
    }
    return { id, kind: 'npx', package: row.package, match, hook, batch };
  }
  if (row.kind === 'external-bin') {
    if (
      !isPlainObject(row.tool) ||
      typeof row.tool.name !== 'string' ||
      typeof row.tool.version !== 'string' ||
      typeof row.tool.githubRelease !== 'string'
    ) {
      throw new Error(`${id}: external-bin requires tool.name, tool.version, tool.githubRelease`);
    }
    return {
      id,
      kind: 'external-bin',
      tool: {
        name: row.tool.name,
        version: row.tool.version,
        githubRelease: row.tool.githubRelease,
      },
      match,
      hook,
      batch,
    };
  }
  if (
    !isPlainObject(row.module) ||
    typeof row.module.name !== 'string' ||
    typeof row.module.version !== 'string' ||
    typeof row.function !== 'string'
  ) {
    throw new Error(`${id}: pwsh-module requires module.name, module.version, and function`);
  }
  return {
    id,
    kind: 'pwsh-module',
    module: { name: row.module.name, version: row.module.version },
    function: row.function,
    match,
    hook,
    batch,
  };
}

/**
 * @param {unknown} raw
 */
export function parseCatalog(raw) {
  if (!isPlainObject(raw) || raw.version !== 1 || !Array.isArray(raw.targets)) {
    throw new Error('catalog must be { version: 1, targets: [] }');
  }
  return {
    version: 1,
    targets: raw.targets.map(parseTarget),
  };
}

/** @param {string} repoRoot */
export function loadCatalog(repoRoot) {
  const schemaPath = path.join(repoRoot, 'lint', 'targets.schema.json');
  const catalogPath = path.join(repoRoot, 'lint', 'targets.json');
  if (!fs.existsSync(schemaPath)) {
    throw new Error('missing lint/targets.schema.json');
  }
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  if (!isPlainObject(schema) || !isPlainObject(schema.$defs) || !schema.$defs.lintTarget) {
    throw new Error('lint/targets.schema.json is not a lint catalog schema');
  }
  const raw = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  return parseCatalog(raw);
}

/**
 * @param {{ kind: 'never' } | { kind: 'when'; extensions: readonly string[]; excludeSuffixes?: readonly string[]; under?: string }} match
 * @param {string} filePath
 * @param {string} repoRoot
 */
export function matchesFile(match, filePath, repoRoot) {
  if (match.kind === 'never') {
    return false;
  }
  const abs = path.resolve(filePath);
  const rel = path.relative(repoRoot, abs).replaceAll('\\', '/');
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    return false;
  }
  const base = path.basename(abs);
  if (match.excludeSuffixes?.some((suffix) => base.endsWith(suffix))) {
    return false;
  }
  if (!match.extensions.some((ext) => base.endsWith(ext))) {
    return false;
  }
  if (match.under) {
    const prefix = match.under.replaceAll('\\', '/').replace(/\/+$/, '');
    if (rel !== prefix && !rel.startsWith(`${prefix}/`)) {
      return false;
    }
  }
  return true;
}

/**
 * @param {ReturnType<typeof parseCatalog>} catalog
 * @param {{ mode: 'project' | 'hook' | 'provision'; path?: string; only?: readonly string[]; repoRoot: string }} request
 */
export function selectTargets(catalog, request) {
  if (request.mode === 'hook') {
    if (!request.path) {
      return [];
    }
    return catalog.targets.filter(
      (target) => target.hook !== null && matchesFile(target.match, request.path, request.repoRoot)
    );
  }
  if (request.only && request.only.length > 0) {
    const wanted = new Set(request.only);
    return catalog.targets.filter((target) => wanted.has(target.id));
  }
  return catalog.targets;
}

/**
 * @param {readonly string[]} tokens
 * @param {{ file?: string; repoRoot: string }} ctx
 */
export function renderArgv(tokens, ctx) {
  return tokens.map((token) => {
    let rendered = token;
    if (ctx.file !== undefined) {
      rendered = rendered.replaceAll('{{file}}', ctx.file);
    }
    return rendered.replaceAll('{{repoRoot}}', ctx.repoRoot);
  });
}

/**
 * @param {string} executable
 * @param {readonly string[]} args
 * @param {string} cwd
 * @returns {Promise<{ exitCode: number; stdout: string; stderr: string }>}
 */
export function spawnProcess(executable, args, cwd) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(executable, [...args], {
        cwd,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      resolve({ exitCode: 1, stdout: '', stderr: message });
      return;
    }
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', (error) => {
      resolve({ exitCode: 1, stdout, stderr: error.message });
    });
    child.on('close', (code) => {
      resolve({ exitCode: code ?? 1, stdout, stderr });
    });
  });
}

function resolvePowerShell() {
  if (process.platform === 'win32') {
    const systemRoot = process.env.SystemRoot ?? 'C:\\Windows';
    return path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  }
  return 'pwsh';
}

/** @param {string} repoRoot */
export function npxCliCandidates(repoRoot) {
  const nodeDir = path.dirname(process.execPath);
  return [
    path.join(nodeDir, 'node_modules', 'npm', 'bin', 'npx-cli.js'),
    path.join(nodeDir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npx-cli.js'),
    path.join(repoRoot, 'node_modules', 'npm', 'bin', 'npx-cli.js'),
  ];
}

/** @param {string} repoRoot */
export function resolveNpxCli(repoRoot) {
  const candidates = npxCliCandidates(repoRoot);
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(`npx-cli.js not found (looked in ${candidates.join(', ')})`);
}

/** @param {readonly string[]} argv */
export function pwshArgvFlags(argv) {
  /** @type {string[]} */
  const flags = [];
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '-Path') {
      i += 1;
      continue;
    }
    flags.push(argv[i]);
  }
  return flags;
}

/** @param {string} url @param {string} dest */
export function curlDownloadArgs(url, dest) {
  return ['-fsSL', '--proto', '=https', '--max-time', String(DOWNLOAD_MAX_SECONDS), '--retry', '2', '-o', dest, url];
}

/** @param {string} repoRoot */
function pssaSettingsPath(repoRoot) {
  return path.join(repoRoot, 'lint', 'PSScriptAnalyzerSettings.psd1');
}

/** @param {string} repoRoot */
export function listPowerShellFiles(repoRoot) {
  /** @type {string[]} */
  const files = [];
  const skipDirs = new Set(['node_modules', 'tmp', '.git', 'dist', 'coverage', 'artifacts']);

  /** @param {string} dir */
  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (skipDirs.has(entry.name)) {
          continue;
        }
        walk(full);
        continue;
      }
      if (entry.name.toLowerCase().endsWith('.ps1')) {
        files.push(full);
      }
    }
  }

  walk(repoRoot);
  return files;
}

/**
 * @param {{ name: string; version: string }} tool
 */
function actionlintAsset(tool) {
  const { version } = tool;
  const { platform, arch } = process;
  /** @type {string} */
  let file;
  const bin = platform === 'win32' ? 'actionlint.exe' : 'actionlint';
  if (platform === 'win32' && arch === 'x64') {
    file = `actionlint_${version}_windows_amd64.zip`;
  } else if (platform === 'win32' && arch === 'arm64') {
    file = `actionlint_${version}_windows_arm64.zip`;
  } else if (platform === 'linux' && arch === 'x64') {
    file = `actionlint_${version}_linux_amd64.tar.gz`;
  } else if (platform === 'linux' && arch === 'arm64') {
    file = `actionlint_${version}_linux_arm64.tar.gz`;
  } else if (platform === 'darwin' && arch === 'x64') {
    file = `actionlint_${version}_darwin_amd64.tar.gz`;
  } else if (platform === 'darwin' && arch === 'arm64') {
    file = `actionlint_${version}_darwin_arm64.tar.gz`;
  } else {
    throw new Error(`unsupported platform for actionlint: ${platform} ${arch}`);
  }
  return { file, bin };
}

/** @param {string} url @param {string} dest */
async function downloadToFile(url, dest) {
  const curl = process.platform === 'win32' ? 'curl.exe' : 'curl';
  const result = await spawnProcess(curl, curlDownloadArgs(url, dest), path.dirname(dest));
  if (result.exitCode !== 0) {
    throw new Error(result.stderr || result.stdout || `curl failed for ${url}`);
  }
}

/**
 * @param {ReturnType<typeof parseTarget>} target
 * @param {string} repoRoot
 */
async function ensureNodeCli(target, repoRoot) {
  if (target.kind !== 'node-cli') {
    throw new Error('ensureNodeCli on non node-cli target');
  }
  const binPath = path.join(repoRoot, 'node_modules', target.bin);
  if (!fs.existsSync(binPath)) {
    return { ready: false, targetId: target.id, reason: `missing ${path.join('node_modules', target.bin)}` };
  }
  return { ready: true, targetId: target.id };
}

/**
 * @param {ReturnType<typeof parseTarget>} target
 * @param {string} repoRoot
 */
async function ensureNpx(target, repoRoot) {
  try {
    resolveNpxCli(repoRoot);
    return { ready: true, targetId: target.id };
  } catch (error) {
    return {
      ready: false,
      targetId: target.id,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * @param {ReturnType<typeof parseTarget>} target
 * @param {string} repoRoot
 */
async function ensureExternalBin(target, repoRoot) {
  if (target.kind !== 'external-bin') {
    throw new Error('ensureExternalBin on non external-bin target');
  }
  const { tool } = target;
  const destDir = path.join(repoRoot, TOOLS_CACHE, tool.name, tool.version);
  const asset = actionlintAsset(tool);
  const binPath = path.join(destDir, asset.bin);
  if (fs.existsSync(binPath)) {
    return { ready: true, targetId: target.id };
  }

  const releaseBase = `https://github.com/${tool.githubRelease}/releases/download/v${tool.version}`;
  const archivePath = path.join(destDir, asset.file);
  fs.mkdirSync(destDir, { recursive: true });

  try {
    const checksumsPath = path.join(destDir, `actionlint_${tool.version}_checksums.txt`);
    await downloadToFile(`${releaseBase}/actionlint_${tool.version}_checksums.txt`, checksumsPath);
    await downloadToFile(`${releaseBase}/${asset.file}`, archivePath);
    const checksums = fs.readFileSync(checksumsPath, 'utf8');
    const digest = crypto.createHash('sha256').update(fs.readFileSync(archivePath)).digest('hex');
    const expectedLine = checksums.split(/\r?\n/).find((line) => line.includes(asset.file));
    const expected = expectedLine?.trim().split(/\s+/)[0];
    if (!expected) {
      return { ready: false, targetId: target.id, reason: `no checksum listed for ${asset.file}` };
    }
    if (expected.toLowerCase() !== digest) {
      fs.rmSync(archivePath, { force: true });
      return { ready: false, targetId: target.id, reason: `checksum mismatch for ${asset.file}` };
    }
    const extract = await spawnProcess('tar', ['-xf', archivePath, '-C', destDir], destDir);
    if (extract.exitCode !== 0) {
      return { ready: false, targetId: target.id, reason: extract.stderr || extract.stdout || 'tar extract failed' };
    }
    if (!fs.existsSync(binPath)) {
      return { ready: false, targetId: target.id, reason: `extracted archive missing ${asset.bin}` };
    }
    if (process.platform !== 'win32') {
      fs.chmodSync(binPath, 0o755);
    }
    return { ready: true, targetId: target.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ready: false, targetId: target.id, reason: message };
  }
}

/** @param {{ name: string; version: string }} module @param {string} repoRoot */
function cachedPwshModuleManifest(module, repoRoot) {
  return path.join(repoRoot, TOOLS_CACHE, module.name, module.version, `${module.name}.psd1`);
}

/**
 * @param {ReturnType<typeof parseTarget>} target
 * @param {string} repoRoot
 */
async function ensurePwshModule(target, repoRoot) {
  if (target.kind !== 'pwsh-module') {
    throw new Error('ensurePwshModule on non pwsh-module target');
  }
  if (fs.existsSync(cachedPwshModuleManifest(target.module, repoRoot))) {
    return { ready: true, targetId: target.id };
  }
  const powershell = resolvePowerShell();
  const { name, version } = target.module;
  const checkScript = [
    `$m = Get-Module -ListAvailable -Name ${psQuote(name)} | Where-Object { $_.Version -eq [version]${psQuote(version)} }`,
    'if ($m) { exit 0 } else { exit 1 }',
  ].join('; ');
  const check = await spawnProcess(powershell, ['-NoProfile', '-NonInteractive', '-Command', checkScript], repoRoot);
  if (check.exitCode === 0) {
    return { ready: true, targetId: target.id };
  }
  const installScript = [
    '[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12',
    'Import-Module PowerShellGet -ErrorAction SilentlyContinue',
    'if (-not (Get-PSRepository -Name PSGallery -ErrorAction SilentlyContinue)) { Register-PSRepository -Default -ErrorAction SilentlyContinue }',
    'Set-PSRepository -Name PSGallery -InstallationPolicy Trusted -ErrorAction SilentlyContinue',
    `Install-Module -Name ${psQuote(name)} -RequiredVersion ${psQuote(version)} -Scope CurrentUser -Force`,
  ].join('; ');
  const install = await spawnProcess(
    powershell,
    ['-NoProfile', '-NonInteractive', '-Command', installScript],
    repoRoot
  );
  const installed = await spawnProcess(powershell, ['-NoProfile', '-NonInteractive', '-Command', checkScript], repoRoot);
  if (installed.exitCode === 0) {
    return { ready: true, targetId: target.id };
  }
  return {
    ready: false,
    targetId: target.id,
    reason: [install.stderr, install.stdout, `Install-Module ${name} ${version} failed`]
      .filter(Boolean)
      .join('\n')
      .trim(),
  };
}

/**
 * @param {ReturnType<typeof parseTarget>} target
 * @param {string} repoRoot
 */
export async function ensureTool(target, repoRoot) {
  switch (target.kind) {
    case 'node-cli':
      return ensureNodeCli(target, repoRoot);
    case 'npx':
      return ensureNpx(target, repoRoot);
    case 'external-bin':
      return ensureExternalBin(target, repoRoot);
    case 'pwsh-module':
      return ensurePwshModule(target, repoRoot);
    default: {
      const exhausted = /** @type {never} */ (target);
      throw new Error(`unknown kind: ${JSON.stringify(exhausted)}`);
    }
  }
}

/**
 * @param {ReturnType<typeof parseTarget>} target
 * @param {readonly string[]} argv
 * @param {string} repoRoot
 */
async function spawnNodeCli(target, argv, repoRoot) {
  if (target.kind !== 'node-cli') {
    throw new Error('spawnNodeCli on non node-cli target');
  }
  const binPath = path.join(repoRoot, 'node_modules', target.bin);
  return spawnProcess(process.execPath, [binPath, ...argv], repoRoot);
}

/**
 * @param {ReturnType<typeof parseTarget>} target
 * @param {readonly string[]} argv
 * @param {string} repoRoot
 */
async function spawnNpx(target, argv, repoRoot) {
  if (target.kind !== 'npx') {
    throw new Error('spawnNpx on non npx target');
  }
  const npxCli = resolveNpxCli(repoRoot);
  return spawnProcess(process.execPath, [npxCli, '--yes', target.package, ...argv], repoRoot);
}

/** @param {readonly string[]} argv @param {string} repoRoot */
function expandWorkflowDirArgs(argv, repoRoot) {
  /** @type {string[]} */
  const expanded = [];
  for (const arg of argv) {
    const abs = path.isAbsolute(arg) ? arg : path.join(repoRoot, arg);
    if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
      const files = fs
        .readdirSync(abs)
        .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
        .map((name) => path.join(abs, name));
      expanded.push(...files);
      continue;
    }
    expanded.push(arg);
  }
  return expanded;
}

/**
 * @param {ReturnType<typeof parseTarget>} target
 * @param {readonly string[]} argv
 * @param {string} repoRoot
 */
async function spawnExternalBin(target, argv, repoRoot) {
  if (target.kind !== 'external-bin') {
    throw new Error('spawnExternalBin on non external-bin target');
  }
  const asset = actionlintAsset(target.tool);
  const binPath = path.join(repoRoot, TOOLS_CACHE, target.tool.name, target.tool.version, asset.bin);
  const resolvedArgv = target.tool.name === 'actionlint' ? expandWorkflowDirArgs(argv, repoRoot) : argv;
  return spawnProcess(binPath, resolvedArgv, repoRoot);
}

/**
 * @param {ReturnType<typeof parseTarget>} target
 * @param {readonly string[]} argv
 * @param {string} repoRoot
 * @param {{ paths?: readonly string[] }} [options]
 */
async function spawnPwshModule(target, argv, repoRoot, options = {}) {
  if (target.kind !== 'pwsh-module') {
    throw new Error('spawnPwshModule on non pwsh-module target');
  }
  const powershell = resolvePowerShell();
  const settings = pssaSettingsPath(repoRoot);
  const paths = options.paths ?? [];
  const hookPathIndex = argv.indexOf('-Path');
  const hookPath = hookPathIndex >= 0 ? argv[hookPathIndex + 1] : undefined;
  const extraFlags = pwshArgvFlags(argv);
  const extraFlagClause = extraFlags.length > 0 ? ` ${extraFlags.join(' ')}` : '';
  const cachedManifest = cachedPwshModuleManifest(target.module, repoRoot);
  const moduleImport = fs.existsSync(cachedManifest)
    ? `Import-Module -Name ${psQuote(cachedManifest)} -ErrorAction Stop`
    : `Import-Module -Name ${psQuote(target.module.name)} -RequiredVersion ${psQuote(target.module.version)} -ErrorAction Stop`;

  /** @type {string[]} */
  const script = [moduleImport];
  if (paths.length > 0) {
    const listFile = path.join(repoRoot, TOOLS_CACHE, 'pssa-paths.txt');
    fs.mkdirSync(path.dirname(listFile), { recursive: true });
    fs.writeFileSync(listFile, `${paths.join('\n')}\n`, 'utf8');
    script.push(`$paths = Get-Content -LiteralPath ${psQuote(listFile)}`);
  } else if (hookPath) {
    script.push(`$paths = @(${psQuote(hookPath)})`);
  } else {
    script.push('$paths = @()');
  }
  if (fs.existsSync(settings)) {
    script.push(`$settings = ${psQuote(settings)}`);
    script.push(`$result = ${target.function} -Path $paths -Settings $settings${extraFlagClause}`);
  } else {
    script.push(`$result = ${target.function} -Path $paths${extraFlagClause}`);
  }
  script.push(
    `if ($result) { $result | ForEach-Object { '{0}:{1} {2} {3}' -f $_.ScriptName, $_.Line, $_.RuleName, $_.Message } | Write-Output }`
  );
  script.push('if ($result) { exit 1 } else { exit 0 }');

  return spawnProcess(powershell, ['-NoProfile', '-NonInteractive', '-Command', script.join('; ')], repoRoot);
}

/**
 * @param {ReturnType<typeof parseTarget>} target
 * @param {readonly string[]} argv
 * @param {string} repoRoot
 * @param {{ paths?: readonly string[] }} [options]
 */
export async function spawnKind(target, argv, repoRoot, options) {
  switch (target.kind) {
    case 'node-cli':
      return spawnNodeCli(target, argv, repoRoot);
    case 'npx':
      return spawnNpx(target, argv, repoRoot);
    case 'external-bin':
      return spawnExternalBin(target, argv, repoRoot);
    case 'pwsh-module':
      return spawnPwshModule(target, argv, repoRoot, options);
    default: {
      const exhausted = /** @type {never} */ (target);
      throw new Error(`unknown kind: ${JSON.stringify(exhausted)}`);
    }
  }
}

/** @param {string} text */
function parseJsonPayload(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('tool output did not contain a JSON object');
  }
  return JSON.parse(text.slice(start, end + 1));
}

/**
 * @param {{ kind: 'exit-code' } | { kind: 'fallow-unused'; maxIssues: 0 } | { kind: 'fallow-dupes'; maxCloneGroups: 0 }} contract
 * @param {{ exitCode: number; stdout: string; stderr: string }} exit
 * @param {string} targetId
 */
export function applyContract(contract, exit, targetId) {
  if (exit.exitCode >= 2 && (contract.kind === 'fallow-unused' || contract.kind === 'fallow-dupes')) {
    return {
      targetId,
      status: 'failed',
      message: `fallow runtime exit ${exit.exitCode}`,
      exitCode: exit.exitCode,
    };
  }

  if (contract.kind === 'exit-code') {
    if (exit.exitCode === 0) {
      return { targetId, status: 'ok' };
    }
    const detail = [exit.stdout, exit.stderr].filter(Boolean).join('\n').trim() || `exit ${exit.exitCode}`;
    return { targetId, status: 'failed', message: detail, exitCode: exit.exitCode };
  }

  try {
    const payload = parseJsonPayload(exit.stdout || exit.stderr);
    if (contract.kind === 'fallow-unused') {
      const total = payload?.check?.total_issues;
      if (typeof total !== 'number') {
        return {
          targetId,
          status: 'failed',
          message: 'fallow unused output missing check.total_issues',
          exitCode: exit.exitCode,
        };
      }
      if (total > contract.maxIssues) {
        return {
          targetId,
          status: 'failed',
          message: `fallow unused total_issues=${total}`,
          exitCode: exit.exitCode,
        };
      }
      return { targetId, status: 'ok' };
    }
    const groups = payload?.clone_groups;
    if (!Array.isArray(groups)) {
      return {
        targetId,
        status: 'failed',
        message: 'fallow dupes output missing clone_groups[]',
        exitCode: exit.exitCode,
      };
    }
    if (groups.length > contract.maxCloneGroups) {
      return {
        targetId,
        status: 'failed',
        message: `fallow dupes clone_groups=${groups.length}`,
        exitCode: exit.exitCode,
      };
    }
    return { targetId, status: 'ok' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { targetId, status: 'failed', message, exitCode: exit.exitCode };
  }
}

/** @param {string} text */
function trimOutput(text, maxLines) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0)
    .slice(0, maxLines)
    .join('\n');
}

/**
 * @param {readonly { targetId: string; status: string; message?: string; reason?: string; exitCode?: number }[]} outcomes
 * @param {string} filePath
 * @param {number} [maxOutputLines]
 */
export function formatHookResponse(outcomes, filePath, maxOutputLines = 25) {
  const failed = outcomes.filter((outcome) => outcome.status === 'failed');
  if (failed.length === 0) {
    return { continue: true };
  }
  const body = failed
    .map((outcome) => `${outcome.targetId}: ${outcome.message ?? 'failed'}`)
    .join('\n');
  return {
    continue: false,
    agent_message: `Lint failed on ${filePath}.\n\n${trimOutput(body, maxOutputLines)}`,
  };
}

/**
 * @param {readonly { targetId: string; status: string; message?: string; reason?: string }[]} outcomes
 */
export function formatProjectReport(outcomes) {
  return outcomes
    .map((outcome) => {
      if (outcome.status === 'ok') {
        return `[ok] ${outcome.targetId}`;
      }
      if (outcome.status === 'skipped') {
        return `[skipped] ${outcome.targetId}: ${outcome.reason ?? ''}`;
      }
      return `[failed] ${outcome.targetId}: ${outcome.message ?? 'failed'}`;
    })
    .join('\n');
}

/**
 * @param {ReturnType<typeof parseTarget>} target
 * @param {readonly string[]} argv
 * @param {string} repoRoot
 * @param {'hook' | 'project'} mode
 */
async function runTargetProcess(target, argv, repoRoot, mode) {
  if (target.kind === 'pwsh-module' && mode === 'project') {
    const files = listPowerShellFiles(repoRoot);
    if (files.length === 0) {
      return { exitCode: 0, stdout: '', stderr: '' };
    }
    return spawnKind(target, argv, repoRoot, { paths: files });
  }
  return spawnKind(target, argv, repoRoot);
}

/**
 * @param {ReturnType<typeof parseTarget>} target
 * @param {readonly string[]} argv
 * @param {string} repoRoot
 * @param {'hook' | 'project'} mode
 */
async function runTargetProcessSafe(target, argv, repoRoot, mode) {
  try {
    return await runTargetProcess(target, argv, repoRoot, mode);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { exitCode: 1, stdout: '', stderr: message };
  }
}

/**
 * @param {{ mode: 'project' | 'hook' | 'provision'; path?: string; only?: readonly string[]; repoRoot: string }} request
 */
export async function runCatalog(request) {
  const catalog = loadCatalog(request.repoRoot);
  const selected = selectTargets(catalog, request);

  if (request.mode === 'provision') {
    /** @type {{ targetId: string; status: string; reason?: string }[]} */
    const outcomes = [];
    for (const target of selected) {
      const provision = await ensureTool(target, request.repoRoot);
      outcomes.push(
        provision.ready
          ? { targetId: target.id, status: 'ok' }
          : { targetId: target.id, status: 'failed', message: provision.reason }
      );
    }
    return { ok: outcomes.every((outcome) => outcome.status === 'ok'), outcomes };
  }

  if (request.mode === 'hook') {
    const filePath = request.path;
    if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return { continue: true };
    }
    if (selected.length === 0) {
      return { continue: true };
    }

    /** @type {{ targetId: string; status: string; message?: string; reason?: string; exitCode?: number }[]} */
    const outcomes = [];
    let maxLines = 25;
    for (const target of selected) {
      if (!target.hook) {
        continue;
      }
      maxLines = Math.max(maxLines, target.hook.maxOutputLines);
      const provision = await ensureTool(target, request.repoRoot);
      if (!provision.ready) {
        if (target.hook.missingTool === 'skip') {
          outcomes.push({ targetId: target.id, status: 'skipped', reason: provision.reason });
          continue;
        }
        outcomes.push({
          targetId: target.id,
          status: 'failed',
          message: provision.reason,
          exitCode: 1,
        });
        continue;
      }
      const argv = renderArgv(target.hook.argv, { file: filePath, repoRoot: request.repoRoot });
      const exit = await runTargetProcessSafe(target, argv, request.repoRoot, 'hook');
      const outcome = applyContract({ kind: 'exit-code' }, exit, target.id);
      if (outcome.status === 'failed') {
        outcome.message = trimOutput(outcome.message ?? '', target.hook.maxOutputLines);
      }
      outcomes.push(outcome);
    }
    return formatHookResponse(outcomes, filePath, maxLines);
  }

  /** @type {{ targetId: string; status: string; message?: string; reason?: string; exitCode?: number }[]} */
  const outcomes = [];
  for (const target of selected) {
    const provision = await ensureTool(target, request.repoRoot);
    if (!provision.ready) {
      outcomes.push({ targetId: target.id, status: 'failed', message: provision.reason, exitCode: 1 });
      continue;
    }

    /** @type {{ targetId: string; status: string; message?: string; exitCode?: number } | null} */
    let failed = null;
    for (const step of target.batch.steps) {
      const argv = renderArgv(step.argv, { repoRoot: request.repoRoot });
      const exit = await runTargetProcessSafe(target, argv, request.repoRoot, 'project');
      const outcome = applyContract(step.contract, exit, target.id);
      if (outcome.status === 'failed') {
        failed = outcome;
        break;
      }
    }
    outcomes.push(failed ?? { targetId: target.id, status: 'ok' });
  }

  return {
    ok: outcomes.every((outcome) => outcome.status === 'ok'),
    outcomes,
  };
}

/**
 * @param {readonly string[]} argv
 */
export function parseCli(argv) {
  /** @type {'project' | 'hook' | 'provision' | null} */
  let mode = null;
  /** @type {string | undefined} */
  let filePath;
  /** @type {string[]} */
  const only = [];
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--mode') {
      mode = /** @type {'project' | 'hook' | 'provision'} */ (argv[i + 1]);
      i += 1;
      continue;
    }
    if (token === '--path') {
      filePath = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === '--only') {
      only.push(argv[i + 1]);
      i += 1;
      continue;
    }
    if (token.startsWith('--only=')) {
      only.push(token.slice('--only='.length));
    }
  }
  if (mode !== 'project' && mode !== 'hook' && mode !== 'provision') {
    throw new Error('usage: node scripts/lint-catalog.mjs --mode project|hook|provision [--path <file>] [--only <id>]');
  }
  if (mode === 'hook' && !filePath) {
    throw new Error('--path is required for hook mode');
  }
  return { mode, filePath, only };
}

/**
 * @param {readonly string[]} argv
 */
export async function main(argv) {
  const parsed = parseCli(argv);
  const repoRoot = repoRootFromModule;
  /** @type {{ mode: 'project' | 'hook' | 'provision'; path?: string; only?: string[]; repoRoot: string }} */
  const request = {
    mode: parsed.mode,
    repoRoot,
  };
  if (parsed.filePath) {
    request.path = path.resolve(parsed.filePath);
  }
  if (parsed.only.length > 0) {
    request.only = parsed.only;
  }

  const result = await runCatalog(request);
  if ('continue' in result) {
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return result.continue ? 0 : 1;
  }

  process.stdout.write(`${formatProjectReport(result.outcomes)}\n`);
  return result.ok ? 0 : 1;
}

const isMain =
  process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);

if (isMain) {
  main(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`${message}\n`);
      process.exitCode = 1;
    });
}
