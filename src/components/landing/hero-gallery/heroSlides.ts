import { createElement, lazy } from 'react';
import HeroAnimation, {
  FleetObservabilityStatic,
  HeroPhaseLoadingFallback,
} from '@/components/landing/HeroAnimation';
import type { HeroSlideDefinition, HeroSlideProps } from './types';
import { ScanMachineStatic } from './scan/ScanMachineStatic';
import { ScanPoster } from './scan/ScanPoster';
import { PmLifecycleStatic } from './pm/PmLifecycleStatic';
import { PmLifecyclePoster } from './pm/PmLifecyclePoster';

const ScanMachineSlide = lazy(() => import('./scan/ScanMachineSlide'));
const PmLifecycleSlide = lazy(() => import('./pm/PmLifecycleSlide'));

function FleetObservabilityStage({ onLoopComplete }: HeroSlideProps) {
  return createElement(HeroAnimation, { stageOnly: true, onLoopComplete });
}

/**
 * Production stories. Additional workflows register here without changing the
 * gallery shell. Customer request and QuickBooks stories stay separate issues
 * until their animations exist.
 */
export const HERO_SLIDES: HeroSlideDefinition[] = [
  {
    id: 'fleet-observability',
    label: 'Fleet observability',
    description:
      'A QR code becomes a map of equipment and work orders across the United States.',
    preload: () => Promise.resolve(),
    Stage: FleetObservabilityStage,
    StaticFrame: FleetObservabilityStatic,
    Fallback: HeroPhaseLoadingFallback,
  },
  {
    id: 'scan-machine',
    label: 'Scan one machine',
    description:
      'A phone scans the QR label on a dozer and opens that machine’s identity, work order, and service history.',
    preload: () => import('./scan/ScanMachineSlide'),
    Stage: ScanMachineSlide,
    StaticFrame: ScanMachineStatic,
    Fallback: ScanPoster,
  },
  {
    id: 'preventive-maintenance',
    label: 'Preventive maintenance',
    description:
      'Meter hours reach 2,500 h to trigger a 500-hour PM checklist, the technician logs inspection results, and EquipQR schedules the next service at 3,000 h.',
    preload: () => import('./pm/PmLifecycleSlide'),
    Stage: PmLifecycleSlide,
    StaticFrame: PmLifecycleStatic,
    Fallback: PmLifecyclePoster,
  },
];
