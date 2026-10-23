import { createElement, lazy } from 'react';
import HeroAnimation, {
  FleetObservabilityStatic,
  HeroPhaseLoadingFallback,
} from '@/components/landing/HeroAnimation';
import type { HeroSlideDefinition, HeroSlideProps } from './types';
import { ScanMachineStatic } from './scan/ScanMachineStatic';
import { ScanPoster } from './scan/ScanPoster';
import { CustomerRequestStatic } from './request/CustomerRequestStatic';
import { CustomerRequestPoster } from './request/CustomerRequestPoster';

const ScanMachineSlide = lazy(() => import('./scan/ScanMachineSlide'));
const CustomerRequestSlide = lazy(() => import('./request/CustomerRequestSlide'));

function FleetObservabilityStage({ onLoopComplete }: HeroSlideProps) {
  return createElement(HeroAnimation, { stageOnly: true, onLoopComplete });
}

/**
 * Production stories. Additional workflows register here without changing the
 * gallery shell. Preventive maintenance and QuickBooks stories stay separate
 * issues until their animations exist.
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
    id: 'customer-request',
    label: 'Customer request',
    description:
      'A customer scans the QR tag to report a hydraulic leak, the shop assigns a technician, and the completed repair updates the machine record.',
    preload: () => import('./request/CustomerRequestSlide'),
    Stage: CustomerRequestSlide,
    StaticFrame: CustomerRequestStatic,
    Fallback: CustomerRequestPoster,
  },
];
