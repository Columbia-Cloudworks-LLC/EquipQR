import type { ComponentType, CSSProperties } from 'react';
import { HERO_SLIDES } from '@/components/landing/hero-gallery/heroSlides';
import { HeroGallery } from '@/components/landing/hero-gallery/HeroGallery';
import QRScanPhase from '@/components/landing/QRScanPhase';
import StateMorphPhase from '@/components/landing/StateMorphPhase';
import AssetDotsPhase from '@/components/landing/AssetDotsPhase';
import NationalMapPhase from '@/components/landing/NationalMapPhase';
import PMChecklistPhase from '@/components/landing/PMChecklistPhase';
import { computeDotPositionsInState } from '@/components/landing/dotPositions';
import type { StateCode } from '@/components/landing/stateVectors';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Discover authored CSS keyframes automatically, including future CSS modules.
import.meta.glob('/src/**/*.css', { eager: true });
const cssSources = import.meta.glob<string>('/src/**/*.css', { query: '?raw', import: 'default', eager: true });
const keyframeNames = [...new Set(Object.values(cssSources).flatMap((source) =>
  [...source.matchAll(/@keyframes\s+([\w-]+)/g)].map((match) => match[1]),
))].sort();

const utilityAnimations = [
  'animate-accordion-down', 'animate-accordion-up', 'animate-caret-blink',
  'animate-fade-in', 'animate-fade-out', 'animate-slide-in-right',
  'animate-slide-out-left', 'animate-slide-in-left', 'animate-slide-out-right',
  'animate-slide-up', 'animate-slide-down', 'animate-stagger-in', 'animate-status-pulse',
];

export interface AnimationFixtureProps {
  state: StateCode;
  seed: number;
  complete: () => void;
}

interface AnimationFixture {
  id: string;
  label: string;
  group: string;
  description: string;
  Stage: ComponentType<AnimationFixtureProps>;
}

/** Add standalone animations here; hero stories are discovered from HERO_SLIDES. */
export const animationCatalog: AnimationFixture[] = [
  ...HERO_SLIDES.map((slide) => ({
    id: slide.id,
    label: slide.label,
    group: 'Stories',
    description: slide.description,
    Stage: ({ complete }: AnimationFixtureProps) => <slide.Stage onLoopComplete={complete} />,
  })),
  { id: 'gallery', label: 'Hero gallery transitions', group: 'Stories', description: 'The real gallery, including story completion, holds, and cross-fades.', Stage: () => <HeroGallery /> },
  { id: 'qr-scan', label: 'QR scan and collapse', group: 'Fleet phases', description: 'Scan line, QR collapse, and handoff to the map.', Stage: ({ complete }) => <QRScanPhase onPhaseComplete={complete} /> },
  { id: 'state-morph', label: 'State outline morph', group: 'Fleet phases', description: 'Morph the scan line into any state outline.', Stage: ({ state, complete }) => <StateMorphPhase stateKey={state} onComplete={complete} /> },
  { id: 'asset-dots', label: 'Equipment entrance and pulse', group: 'Fleet phases', description: 'Seeded equipment placement, staggered entrance, and continuous pulse.', Stage: ({ state, seed }) => <AssetDotsPhase stateKey={state} dots={computeDotPositionsInState(state, 10, seed, 12)} /> },
  { id: 'national-map', label: 'National map and feature cards', group: 'Fleet phases', description: 'Map expansion, state borders, equipment, and timed feature cards. Seed selects the card set.', Stage: ({ seed, complete }) => <NationalMapPhase cycleSeed={seed} nationalSeed={seed} onComplete={complete} /> },
  { id: 'checklist-left', label: 'Checklist and export · right panel', group: 'Fleet phases', description: 'Connector, checklist reveal, timed checks, export press, and fade. Seed selects the export target.', Stage: ({ seed, complete }) => <PMChecklistPhase slideDirection="left" dotStageX={25} dotStageY={50} exportSeed={seed} onComplete={complete} /> },
  { id: 'checklist-right', label: 'Checklist and export · left panel', group: 'Fleet phases', description: 'The mirrored checklist sequence.', Stage: ({ seed, complete }) => <PMChecklistPhase slideDirection="right" dotStageX={75} dotStageY={50} exportSeed={seed} onComplete={complete} /> },
  { id: 'loading', label: 'Loading spinner and skeleton', group: 'Interface', description: 'Shared loading animations used throughout the app.', Stage: () => <div className="grid h-full place-content-center gap-8"><Loader2 className="h-12 w-12 animate-spin text-primary" /><div className="h-16 w-52 animate-pulse rounded bg-muted" /></div> },
  { id: 'skeleton-shimmer', label: 'Skeleton shimmer', group: 'Interface', description: 'The actual shared Skeleton component, including its animated pseudo-element.', Stage: () => <div className="grid h-full place-content-center"><Skeleton className="h-24 w-48" /></div> },
  { id: 'list-entrance', label: 'Staggered list entrance', group: 'Interface', description: 'Shared list reveal with staggered delays.', Stage: () => <div className="space-y-3 p-8">{[0, 1, 2, 3].map((i) => <div key={i} className="animate-stagger-in rounded border p-4" style={{ animationDelay: `${i * 80}ms` }}>Equipment {i + 1}</div>)}</div> },
  { id: 'empty-state', label: 'Empty state entrance', group: 'Interface', description: 'Shared empty-state fade and scale.', Stage: () => <div className="grid h-full place-content-center"><div className="animate-empty-state-in rounded border p-10">No equipment yet</div></div> },
  { id: 'pricing-scroll', label: 'Pricing collage scroll', group: 'Interface', description: 'The shared continuous collage motion at its 48-second speed.', Stage: () => <div className="h-full overflow-hidden"><div className="pricing-collage-track-animated pricing-collage-duration-48000">{[0, 1, 2, 0, 1, 2].map((i, index) => <div key={index} className="m-4 grid h-40 place-content-center rounded border bg-muted">Equipment view {i + 1}</div>)}</div></div> },
  { id: 'overlay-enter', label: 'Overlay fade, zoom, and slide in', group: 'Interface', description: 'Shared dialog and popover entrance utilities.', Stage: () => <div className="grid h-full place-content-center"><div className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200 rounded border bg-card p-10">Overlay content</div></div> },
  { id: 'overlay-exit', label: 'Overlay fade, zoom, and slide out', group: 'Interface', description: 'Shared overlay exit utilities.', Stage: () => <div className="grid h-full place-content-center"><div className="animate-out fade-out-0 zoom-out-95 slide-out-to-top-2 duration-200 rounded border bg-card p-10">Overlay content</div></div> },
  ...utilityAnimations.map((className) => ({
    id: className, label: className.replace('animate-', ''), group: 'Configured utilities',
    description: 'Shared animation utility at its configured duration. Accordion height is supplied by the fixture.',
    Stage: () => <div className="grid h-full place-content-center"><div className={`${className} h-24 w-24 rounded-xl border-2 border-primary bg-primary/20`} style={{ '--radix-accordion-content-height': '96px' } as CSSProperties} /></div>,
  })),
  ...keyframeNames.map((name) => ({
    id: `css-${name}`, label: name, group: 'CSS keyframes',
    description: 'Automatically discovered keyframe on a reference tile (2 seconds). Use the story fixtures above to inspect its original composition and timing.',
    Stage: () => <div className="grid h-full place-content-center"><div className="h-24 w-24 rounded-xl border-2 border-primary bg-primary/20" style={{ animation: `${name} 2s linear both`, '--radix-accordion-content-height': '96px' } as CSSProperties} /></div>,
  })),
];
