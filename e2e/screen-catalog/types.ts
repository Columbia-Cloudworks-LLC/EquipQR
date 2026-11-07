/**
 * Screen catalog manifest types.
 *
 * A flow is an ordered set of screens that tells one workflow story
 * ("Work orders: list -> filters -> detail -> create dialog"). Every screen
 * starts from a fresh navigation to `route` and then replays its own `steps`,
 * so screens never depend on each other and can run in any order.
 */
import type { PersonaKey } from '../user/shared/seed-data';

/** Signed-in seeded persona, or `anonymous` for logged-out public pages. */
export type CatalogPersona = Extract<PersonaKey, 'owner' | 'technician'> | 'anonymous';

export type CatalogArea =
  | 'Public'
  | 'Home'
  | 'Fleet'
  | 'Maintenance'
  | 'Inventory'
  | 'Field'
  | 'Organization'
  | 'Account';

export type CaptureMode = 'page' | 'overlay' | 'viewport';

type AriaRole = Parameters<import('@playwright/test').Page['getByRole']>[0];

/** How a step finds its element. Prefer role + accessible name. */
export type CatalogTarget =
  | { role: AriaRole; name: string | RegExp; exact?: boolean; nth?: number; within?: 'dialog' }
  | { label: string | RegExp; nth?: number; within?: 'dialog' }
  | { placeholder: string | RegExp; nth?: number; within?: 'dialog' }
  | { text: string | RegExp; nth?: number; within?: 'dialog' }
  | { css: string; nth?: number; within?: 'dialog' };

export type CatalogStep =
  | { action: 'click'; target: CatalogTarget; note?: string }
  | { action: 'fill'; target: CatalogTarget; value: string; note?: string }
  | { action: 'press'; key: string; note?: string }
  | { action: 'waitFor'; target: CatalogTarget; note?: string }
  | { action: 'scrollIntoView'; target: CatalogTarget; note?: string };

export interface CatalogScreen {
  /** Stable slug, unique within the flow. Used in file paths. */
  id: string;
  title: string;
  /** What the screen is for and what to look at. Shown in the gallery and copied as context. */
  description: string;
  /** Path to open before replaying steps (relative to baseURL). */
  route: string;
  /** Repo-relative source files most relevant to this screen. Validated to exist. */
  sources: string[];
  steps?: CatalogStep[];
  /**
   * `page` slices the page's main scroll container.
   * `overlay` slices the topmost open dialog / sheet / drawer instead.
   * `viewport` takes one shot of the current viewport without scrolling (menus, popovers).
   * Defaults to `overlay` when a dialog is open after the steps, `viewport` when a
   * menu / listbox / popover is open, else `page`.
   */
  capture?: CaptureMode;
  /** Element that must be visible before capture (beyond the generic settle checks). */
  ready?: CatalogTarget;
  /** Restrict this screen to a subset of the flow's personas. */
  personas?: CatalogPersona[];
  /** CSS selectors whose boxes are painted over in screenshots (truly non-deterministic content). */
  mask?: string[];
}

export interface CatalogFlow {
  /** Stable slug used in file paths and `--flow`. */
  id: string;
  title: string;
  area: CatalogArea;
  description: string;
  personas: CatalogPersona[];
  screens: CatalogScreen[];
}

/** Written next to each screen's slices as screen.json, and aggregated into manifest.json. */
export interface CapturedScreen {
  flowId: string;
  flowTitle: string;
  area: CatalogArea;
  screenId: string;
  screenTitle: string;
  description: string;
  persona: CatalogPersona;
  personaLabel: string;
  device: string;
  viewport: { width: number; height: number; deviceScaleFactor: number };
  clock: string;
  route: string;
  finalUrl: string;
  pageTitle: string;
  howToReach: string[];
  sources: string[];
  status: 'ok' | 'error';
  error?: string;
  warnings: string[];
  /** Informational notes about the capture (e.g. masked run-time timestamps). */
  notes: string[];
  captureMode: CaptureMode;
  scroll: {
    container: string;
    scrollHeight: number;
    clientHeight: number;
    topInset: number;
    bottomInset: number;
    truncated: boolean;
  };
  /** Screen folder, relative to the catalog root. */
  dir: string;
  slices: Array<{ file: string; index: number; scrollTop: number }>;
  headings: string[];
  visibleText: string;
  ariaSnapshot: string;
  consoleErrors: string[];
  failedRequests: string[];
  capturedAt: string;
  orderIndex: number;
}
