/**
 * Have I Been Pwned k-anonymity password range check (SHA-1 prefix API).
 * https://haveibeenpwned.com/API/v3#PwnedPasswords
 */

import { hashPasswordSha1Hex } from '@/lib/passwordPolicy';

const prefixCache = new Map<string, string>();

export type HibpCheckResult =
  | { status: 'ok'; breached: false }
  | { status: 'ok'; breached: true }
  | { status: 'error'; message: string };

function parseSuffixLine(line: string): { suffix: string; count: number } | null {
  const idx = line.indexOf(':');
  if (idx === -1) return null;
  const suffix = line.slice(0, idx).trim().toUpperCase();
  const count = Number(line.slice(idx + 1).trim());
  if (!suffix || Number.isNaN(count)) return null;
  return { suffix, count };
}

export async function checkPasswordBreachedHibp(password: string): Promise<HibpCheckResult> {
  try {
    const sha1 = await hashPasswordSha1Hex(password);
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    let body = prefixCache.get(prefix);
    if (body === undefined) {
      const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        headers: { 'Add-Padding': 'true' },
      });
      if (!res.ok) {
        return { status: 'error', message: `HIBP HTTP ${res.status}` };
      }
      body = await res.text();
      prefixCache.set(prefix, body);
    }

    for (const line of body.split('\r\n')) {
      if (!line.trim()) continue;
      const parsed = parseSuffixLine(line);
      if (parsed && parsed.suffix === suffix) {
        return { status: 'ok', breached: true };
      }
    }

    return { status: 'ok', breached: false };
  } catch (e) {
    return {
      status: 'error',
      message: e instanceof Error ? e.message : 'Network error',
    };
  }
}
