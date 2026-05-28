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
  stagePauseMs: number;
  watchPauseMs: number;
};

const DEFAULT_CONFIG: UserRegressionRunConfig = {
  baseURL: 'http://localhost:8080',
  recordAllVideos: false,
  annotateVideos: false,
  actionOverlay: false,
  overlayMode: 'debug',
  slowMoMs: 0,
  stagePauseMs: 0,
  watchPauseMs: 0,
};

const DEFAULT_CONFIG_PATH = path.join(process.cwd(), 'e2e', 'user', 'run-config.defaults.json');
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

function normalizeRunConfig(raw: Record<string, unknown>, fallback: UserRegressionRunConfig): UserRegressionRunConfig {
  return {
    baseURL: baseUrlOrDefault(raw.baseURL ?? fallback.baseURL),
    recordAllVideos: boolOrDefault(raw.recordAllVideos, fallback.recordAllVideos),
    annotateVideos: boolOrDefault(raw.annotateVideos, fallback.annotateVideos),
    actionOverlay: boolOrDefault(raw.actionOverlay, fallback.actionOverlay),
    overlayMode: overlayModeOrDefault(raw.overlayMode ?? fallback.overlayMode),
    slowMoMs: nonNegativeNumberOrDefault(raw.slowMoMs, fallback.slowMoMs),
    stagePauseMs: nonNegativeNumberOrDefault(raw.stagePauseMs, fallback.stagePauseMs),
    watchPauseMs: nonNegativeNumberOrDefault(raw.watchPauseMs, fallback.watchPauseMs),
  };
}

function loadDefaultConfig(): UserRegressionRunConfig {
  try {
    const raw = JSON.parse(
      fs.readFileSync(DEFAULT_CONFIG_PATH, 'utf8').replace(/^\uFEFF/, ''),
    ) as Record<string, unknown>;
    return normalizeRunConfig(raw, DEFAULT_CONFIG);
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function loadUserRegressionRunConfig(): UserRegressionRunConfig {
  const defaults = loadDefaultConfig();

  try {
    const stat = fs.statSync(RUN_CONFIG_PATH);
    if (Date.now() - stat.mtimeMs > MAX_CONFIG_AGE_MS) {
      return defaults;
    }

    const raw = JSON.parse(
      fs.readFileSync(RUN_CONFIG_PATH, 'utf8').replace(/^\uFEFF/, ''),
    ) as Record<string, unknown>;
    return normalizeRunConfig(raw, defaults);
  } catch {
    return defaults;
  }
}
