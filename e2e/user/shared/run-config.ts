import fs from 'fs';
import path from 'path';

export type ActionOverlayMode = 'debug' | 'marketing';

export type UserRegressionRunConfig = {
  baseURL: string;
  recordAllVideos: boolean;
  annotateVideos: boolean;
  actionOverlay: boolean;
  overlayMode: ActionOverlayMode;
  slowMoMs: number;
  watchPauseMs: number;
};

const DEFAULT_CONFIG: UserRegressionRunConfig = {
  baseURL: 'http://localhost:8080',
  recordAllVideos: false,
  annotateVideos: false,
  actionOverlay: false,
  overlayMode: 'debug',
  slowMoMs: 0,
  watchPauseMs: 0,
};

const RUN_CONFIG_PATH = path.join(process.cwd(), 'tmp', 'playwright', 'run-config.json');
const MAX_CONFIG_AGE_MS = 6 * 60 * 60 * 1000;

function boolOrDefault(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function nonNegativeNumberOrDefault(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : fallback;
}

function overlayModeOrDefault(value: unknown): ActionOverlayMode {
  return value === 'marketing' ? 'marketing' : 'debug';
}

function baseUrlOrDefault(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return DEFAULT_CONFIG.baseURL;
  return value.trim().replace(/\/+$/, '');
}

export function loadUserRegressionRunConfig(): UserRegressionRunConfig {
  try {
    const stat = fs.statSync(RUN_CONFIG_PATH);
    if (Date.now() - stat.mtimeMs > MAX_CONFIG_AGE_MS) {
      return DEFAULT_CONFIG;
    }

    const raw = JSON.parse(fs.readFileSync(RUN_CONFIG_PATH, 'utf8')) as Record<string, unknown>;
    return {
      baseURL: baseUrlOrDefault(raw.baseURL),
      recordAllVideos: boolOrDefault(raw.recordAllVideos, DEFAULT_CONFIG.recordAllVideos),
      annotateVideos: boolOrDefault(raw.annotateVideos, DEFAULT_CONFIG.annotateVideos),
      actionOverlay: boolOrDefault(raw.actionOverlay, DEFAULT_CONFIG.actionOverlay),
      overlayMode: overlayModeOrDefault(raw.overlayMode),
      slowMoMs: nonNegativeNumberOrDefault(raw.slowMoMs, DEFAULT_CONFIG.slowMoMs),
      watchPauseMs: nonNegativeNumberOrDefault(raw.watchPauseMs, DEFAULT_CONFIG.watchPauseMs),
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}
