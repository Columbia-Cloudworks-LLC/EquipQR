import { createElement, lazy } from 'react';
import HeroAnimation, {
  FleetObservabilityStatic,
  HeroPhaseLoadingFallback,
} from '@/components/landing/HeroAnimation';
import type { HeroSlideDefinition, HeroSlideProps } from './types';
import { ScanMachineStatic } from './scan/ScanMachineStatic';
import { ScanPoster } from './scan/ScanPoster';
import { QuickBooksInvoiceStatic } from './billing/QuickBooksInvoiceStatic';
import { QuickBooksInvoicePoster } from './billing/QuickBooksInvoicePoster';

const ScanMachineSlide = lazy(() => import('./scan/ScanMachineSlide'));
const QuickBooksInvoiceSlide = lazy(() => import('./billing/QuickBooksInvoiceSlide'));

function FleetObservabilityStage({ onLoopComplete }: HeroSlideProps) {
  return createElement(HeroAnimation, { stageOnly: true, onLoopComplete });
}

/**
 * Production stories. Additional workflows register here without changing the
 * gallery shell. Customer request and preventive maintenance stories stay
 * separate issues until their animations exist.
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
    id: 'quickbooks-invoice',
    label: 'QuickBooks draft invoice',
    description:
      'Completed field work resolves into labor and parts charges, the office approves the review, and EquipQR exports a traceable QuickBooks draft invoice.',
    preload: () => import('./billing/QuickBooksInvoiceSlide'),
    Stage: QuickBooksInvoiceSlide,
    StaticFrame: QuickBooksInvoiceStatic,
    Fallback: QuickBooksInvoicePoster,
  },
];
