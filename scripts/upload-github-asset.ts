#!/usr/bin/env tsx

/**
 * Upload a PR evidence asset to GitHub user-attachments for inline markdown display.
 *
 * Uses GitHub's internal upload flow (same as drag-and-drop in PR comments). Requires a
 * browser `user_session` cookie via GH_SESSION_TOKEN — not a PAT.
 *
 * Usage:
 *   npx tsx scripts/upload-github-asset.ts <file-path> [--repo owner/repo]
 *
 * Environment:
 *   GH_SESSION_TOKEN — GitHub user_session cookie value (User scope or CI secret)
 *   OUTPUT_JSON — emit JSON result on stdout
 */

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_JSON = process.env.OUTPUT_JSON === 'true';

type UploadResult = {
  success: boolean;
  publicUrl?: string;
  markdownLine?: string;
  contentType?: string;
  error?: string;
};

type PolicyResponse = {
  upload_url: string;
  asset: {
    id: number;
    href: string;
    content_type: string;
  };
  form: Record<string, string>;
  asset_upload_authenticity_token: string;
};

function emit(result: UploadResult): never {
  if (OUTPUT_JSON) {
    console.log(JSON.stringify(result));
  } else if (result.success) {
    console.log(result.markdownLine ?? result.publicUrl);
  } else {
    console.error(`❌ ${result.error}`);
  }
  process.exit(result.success ? 0 : 1);
}

function parseArgs(argv: string[]): { filePath: string; repo: string | null } {
  const positional: string[] = [];
  let repo: string | null = null;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--repo') {
      repo = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    positional.push(arg);
  }

  if (positional.length < 1) {
    emit({
      success: false,
      error:
        'Missing file path. Usage: npx tsx scripts/upload-github-asset.ts <file-path> [--repo owner/repo]',
    });
  }

  return { filePath: positional[0], repo };
}

function resolveSessionToken(): string | null {
  const fromEnv = process.env.GH_SESSION_TOKEN?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const extract = spawnSync('gh', ['image', 'extract-token'], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });

  if (extract.status === 0) {
    const token = extract.stdout.trim();
    return token.length > 0 ? token : null;
  }

  return null;
}

function resolveRepo(explicitRepo: string | null): string {
  if (explicitRepo?.includes('/')) {
    return explicitRepo;
  }

  const remote = spawnSync('git', ['remote', 'get-url', 'origin'], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });

  if (remote.status !== 0) {
    emit({ success: false, error: 'Could not infer repository. Pass --repo owner/repo.' });
  }

  const match = remote.stdout.trim().match(/github\.com[:/](?<owner>[^/]+)\/(?<repo>[^/.]+)/i);
  if (!match?.groups?.owner || !match.groups.repo) {
    emit({ success: false, error: `Could not parse origin remote: ${remote.stdout.trim()}` });
  }

  return `${match.groups.owner}/${match.groups.repo}`;
}

function githubCookieHeader(sessionToken: string): string {
  return `user_session=${sessionToken}; __Host-user_session_same_site=${sessionToken}`;
}

async function fetchRepoId(owner: string, repo: string): Promise<number> {
  const result = spawnSync(
    'gh',
    ['api', `repos/${owner}/${repo}`, '--jq', '.id'],
    { encoding: 'utf8', shell: process.platform === 'win32' },
  );

  if (result.status !== 0 || !result.stdout.trim()) {
    emit({
      success: false,
      error: `gh api repos/${owner}/${repo} failed: ${result.stderr.trim() || result.stdout.trim()}`,
    });
  }

  const repoId = Number.parseInt(result.stdout.trim(), 10);
  if (!Number.isFinite(repoId) || repoId <= 0) {
    emit({ success: false, error: `Invalid repository id for ${owner}/${repo}` });
  }

  return repoId;
}

async function getUploadToken(owner: string, repo: string, sessionToken: string): Promise<string> {
  const response = await fetch(`https://github.com/${owner}/${repo}`, {
    headers: {
      Cookie: githubCookieHeader(sessionToken),
      Accept: 'text/html',
    },
  });

  if (!response.ok) {
    emit({
      success: false,
      error: `Failed to load repo page (${response.status}). Check GH_SESSION_TOKEN and repo access.`,
    });
  }

  const html = await response.text();
  const match = html.match(/"uploadToken":"([^"]+)"/);
  if (!match?.[1]) {
    emit({
      success: false,
      error:
        'uploadToken not found on repo page. Set GH_SESSION_TOKEN from an account with write access (gh image extract-token).',
    });
  }

  return match[1];
}

function detectContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
  };
  return map[ext] ?? 'application/octet-stream';
}

function buildMarkdownLine(publicUrl: string, contentType: string, fileName: string): string {
  if (contentType.startsWith('video/')) {
    return publicUrl;
  }

  return `![${fileName}](${publicUrl})`;
}

async function requestUploadPolicy(
  owner: string,
  repo: string,
  sessionToken: string,
  uploadToken: string,
  repoId: number,
  fileName: string,
  fileSize: number,
  contentType: string,
): Promise<PolicyResponse> {
  const form = new FormData();
  form.set('name', fileName);
  form.set('size', String(fileSize));
  form.set('content_type', contentType);
  form.set('authenticity_token', uploadToken);
  form.set('repository_id', String(repoId));

  const response = await fetch('https://github.com/upload/policies/assets', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Origin: 'https://github.com',
      Referer: `https://github.com/${owner}/${repo}`,
      'X-Requested-With': 'XMLHttpRequest',
      Cookie: githubCookieHeader(sessionToken),
    },
    body: form,
  });

  if (!response.ok) {
    const body = await response.text();
    emit({
      success: false,
      error: `Upload policy request failed (${response.status}): ${body.slice(0, 400)}`,
    });
  }

  return (await response.json()) as PolicyResponse;
}

async function uploadToS3(
  policy: PolicyResponse,
  filePath: string,
  fileName: string,
): Promise<void> {
  const form = new FormData();
  for (const [key, value] of Object.entries(policy.form)) {
    form.set(key, value);
  }

  const fileBuffer = fs.readFileSync(filePath);
  form.set(
    'file',
    new Blob([fileBuffer], { type: policy.form['Content-Type'] ?? detectContentType(filePath) }),
    fileName,
  );

  const response = await fetch(policy.upload_url, {
    method: 'POST',
    headers: {
      Origin: 'https://github.com',
    },
    body: form,
  });

  if (response.status !== 204 && !response.ok) {
    const body = await response.text();
    emit({
      success: false,
      error: `S3 upload failed (${response.status}): ${body.slice(0, 400)}`,
    });
  }
}

async function finalizeUpload(
  owner: string,
  repo: string,
  sessionToken: string,
  policy: PolicyResponse,
): Promise<{ href: string; content_type: string }> {
  const form = new FormData();
  form.set('authenticity_token', policy.asset_upload_authenticity_token);

  const response = await fetch(`https://github.com/upload/assets/${policy.asset.id}`, {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      Origin: 'https://github.com',
      Referer: `https://github.com/${owner}/${repo}`,
      'X-Requested-With': 'XMLHttpRequest',
      Cookie: githubCookieHeader(sessionToken),
    },
    body: form,
  });

  if (!response.ok) {
    const body = await response.text();
    emit({
      success: false,
      error: `Upload finalize failed (${response.status}): ${body.slice(0, 400)}`,
    });
  }

  const finalized = (await response.json()) as { href: string; content_type: string };
  return finalized;
}

async function uploadGitHubAsset(filePath: string, repoSlug: string): Promise<UploadResult> {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    return { success: false, error: `File not found: ${absolutePath}` };
  }

  const sessionToken = resolveSessionToken();
  if (!sessionToken) {
    return {
      success: false,
      error:
        'GH_SESSION_TOKEN is required for GitHub video upload. Run `gh image extract-token` locally and set User-scope GH_SESSION_TOKEN, or install gh-image and sign in via browser.',
    };
  }

  const [owner, repo] = repoSlug.split('/');
  if (!owner || !repo) {
    return { success: false, error: `Invalid --repo value: ${repoSlug}` };
  }

  const stats = fs.statSync(absolutePath);
  const fileName = path.basename(absolutePath);
  const contentType = detectContentType(absolutePath);
  const repoId = await fetchRepoId(owner, repo);
  const uploadToken = await getUploadToken(owner, repo, sessionToken);
  const policy = await requestUploadPolicy(
    owner,
    repo,
    sessionToken,
    uploadToken,
    repoId,
    fileName,
    stats.size,
    contentType,
  );

  await uploadToS3(policy, absolutePath, fileName);
  const finalized = await finalizeUpload(owner, repo, sessionToken, policy);
  const publicUrl = finalized.href || policy.asset.href;

  return {
    success: true,
    publicUrl,
    markdownLine: buildMarkdownLine(publicUrl, contentType, fileName),
    contentType,
  };
}

async function main(): Promise<void> {
  const { filePath, repo } = parseArgs(process.argv.slice(2));
  const repoSlug = resolveRepo(repo);
  const result = await uploadGitHubAsset(filePath, repoSlug);
  emit(result);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  emit({ success: false, error: message });
});
