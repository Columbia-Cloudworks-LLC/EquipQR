/**
 * Pure helpers for the screen catalog gallery: grouping captured screens in
 * manifest order and rendering the Markdown context that gets copied into
 * GitHub issues or handed to Claude.
 */
import type { CapturedScreen, CatalogFlow, CatalogPersona } from '../../e2e/screen-catalog/types';

export interface GalleryLane {
  persona: CatalogPersona;
  personaLabel: string;
  frames: GalleryFrame[];
}

export interface GalleryFrame {
  key: string;
  order: number;
  screenId: string;
  title: string;
  description: string;
  route: string;
  /** null when this (flow, persona, screen) is in the manifest but has no capture on disk. */
  capture: CapturedScreen | null;
}

export interface GalleryFlow {
  id: string;
  title: string;
  area: string;
  description: string;
  lanes: GalleryLane[];
}

const PERSONA_LABELS: Record<CatalogPersona, string> = {
  owner: 'Owner',
  technician: 'Technician',
  anonymous: 'Logged out',
};

export function screenKey(flowId: string, persona: string, screenId: string): string {
  return `${flowId}/${persona}/${screenId}`;
}

/** Arrange captures in manifest order; manifest entries without a capture become placeholders. */
export function buildGalleryModel(flows: CatalogFlow[], captures: CapturedScreen[]): GalleryFlow[] {
  const byKey = new Map(captures.map((capture) => [screenKey(capture.flowId, capture.persona, capture.screenId), capture]));
  return flows.map((flow) => ({
    id: flow.id,
    title: flow.title,
    area: flow.area,
    description: flow.description,
    lanes: flow.personas.map((persona) => {
      const frames = flow.screens
        .map((screen, index) => ({ screen, order: index + 1 }))
        .filter(({ screen }) => !screen.personas || screen.personas.includes(persona))
        .map(({ screen, order }) => {
          const key = screenKey(flow.id, persona, screen.id);
          return {
            key,
            order,
            screenId: screen.id,
            title: screen.title,
            description: screen.description,
            route: screen.route,
            capture: byKey.get(key) ?? null,
          };
        });
      const labelled = frames.find((frame) => frame.capture)?.capture?.personaLabel;
      return { persona, personaLabel: labelled ?? PERSONA_LABELS[persona], frames };
    }),
  }));
}

const fence = (body: string, lang = '') => {
  const longest = Math.max(2, ...[...body.matchAll(/`+/g)].map((match) => match[0].length));
  const ticks = '`'.repeat(longest + 1);
  return `${ticks}${lang}\n${body}\n${ticks}`;
};

export interface ContextOptions {
  /** Absolute directory the slice paths are relative to, so Claude can open the PNGs. */
  absoluteRoot: string;
  /** Include the full rendered text and accessibility tree (long). */
  includeText?: boolean;
}

/** Markdown describing one captured screen: where it is, how to reach it, what it shows. */
export function screenContextMarkdown(capture: CapturedScreen, options: ContextOptions): string {
  const { absoluteRoot, includeText = true } = options;
  const lines: string[] = [];
  lines.push(`## ${capture.flowTitle} › ${capture.screenTitle}`);
  lines.push('');
  lines.push(capture.description);
  lines.push('');
  lines.push(`- **Persona:** ${capture.personaLabel}`);
  lines.push(`- **Route:** \`${capture.route}\`${capture.finalUrl && capture.finalUrl !== capture.route ? ` (landed on \`${capture.finalUrl}\`)` : ''}`);
  lines.push(
    `- **Device:** ${capture.device}, ${capture.viewport.width}×${capture.viewport.height} CSS px @${capture.viewport.deviceScaleFactor}x, dark theme`,
  );
  lines.push(`- **Browser clock:** ${capture.clock}`);
  lines.push(`- **Capture:** ${capture.captureMode} — ${capture.slices.length} slice(s) of \`${capture.scroll.container || 'n/a'}\``);
  if (capture.status === 'error') lines.push(`- **Capture failed:** ${capture.error?.split('\n')[0] ?? 'unknown error'}`);
  lines.push('');
  lines.push('**How to reach it**');
  lines.push('');
  capture.howToReach.forEach((step, index) => lines.push(`${index + 1}. ${step}`));
  lines.push('');
  lines.push('**Source files**');
  lines.push('');
  capture.sources.forEach((source) => lines.push(`- \`${source}\``));
  lines.push('');
  lines.push('**Screenshots** (top to bottom)');
  lines.push('');
  capture.slices.forEach((slice) =>
    lines.push(`- Slice ${slice.index} (scrollTop ${slice.scrollTop}px): \`${absoluteRoot}/${slice.file}\``),
  );
  if (capture.notes?.length) {
    lines.push('');
    capture.notes.forEach((note) => lines.push(`> ${note}`));
  }
  if (capture.warnings.length) {
    lines.push('');
    lines.push('**Capture warnings**');
    lines.push('');
    capture.warnings.forEach((warning) => lines.push(`- ${warning}`));
  }
  if (capture.consoleErrors.length) {
    lines.push('');
    lines.push('**Console errors during capture**');
    lines.push('');
    lines.push(fence([...new Set(capture.consoleErrors)].join('\n')));
  }
  if (capture.failedRequests.length) {
    lines.push('');
    lines.push('**Failed requests during capture**');
    lines.push('');
    lines.push(fence([...new Set(capture.failedRequests)].join('\n')));
  }
  if (capture.headings.length) {
    lines.push('');
    lines.push('**Headings**');
    lines.push('');
    capture.headings.forEach((heading) => lines.push(`- ${heading}`));
  }
  if (includeText) {
    lines.push('');
    lines.push('**Rendered text**');
    lines.push('');
    lines.push(fence(capture.visibleText || '(none)', 'text'));
    lines.push('');
    lines.push('**Accessibility tree**');
    lines.push('');
    lines.push(fence(capture.ariaSnapshot || '(none)', 'yaml'));
  }
  return `${lines.join('\n')}\n`;
}

/** Top-level INDEX.md: every screen with its context file, for pointing Claude at the whole run. */
export function indexMarkdown(model: GalleryFlow[], meta: { device: string; clock: string; builtAt: string }): string {
  const lines = [
    '# EquipQR screen catalog',
    '',
    `Device: ${meta.device} · Browser clock: ${meta.clock} · Built: ${meta.builtAt}`,
    '',
    'Each screen folder holds `slice-NN.png` (top to bottom), `screen.json` and `context.md`.',
    '',
  ];
  for (const flow of model) {
    lines.push(`## ${flow.area} › ${flow.title}`, '', flow.description, '');
    for (const lane of flow.lanes) {
      lines.push(`### ${lane.personaLabel}`, '');
      for (const frame of lane.frames) {
        const capture = frame.capture;
        if (!capture) {
          lines.push(`- ${String(frame.order).padStart(2, '0')} ${frame.title} — _not captured_`);
          continue;
        }
        const folder = capture.dir;
        const status = capture.status === 'error' ? ' — **capture failed**' : '';
        lines.push(
          `- ${String(frame.order).padStart(2, '0')} [${frame.title}](${folder}/context.md) · \`${frame.route}\` · ${capture.slices.length} slice(s)${status}`,
        );
      }
      lines.push('');
    }
  }
  return `${lines.join('\n')}\n`;
}
