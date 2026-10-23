import { Printer, Smartphone, Truck, FileText, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import LandingReveal from './LandingReveal';

interface HardwareTier {
  id: string;
  tierLabel: string;
  icon: LucideIcon;
  hardware: string;
  bestFor: string;
  recommendedMedia: string;
}

const HARDWARE_TIERS: HardwareTier[] = [
  {
    id: 'field-service-truck',
    tierLabel: 'The Field / Service Truck Option',
    icon: Truck,
    hardware: 'Brady M210 Handheld Industrial Label Maker',
    bestFor:
      'Throw-in-the-truck durability; standalone operation without a phone or PC.',
    recommendedMedia:
      'Brady B-595 All-Weather Outdoor Vinyl (0.75" width) — rated for 8–10 years outdoor UV, rain, diesel, and chemical exposure.',
  },
  {
    id: 'mobile-bluetooth',
    tierLabel: 'The Mobile / Bluetooth Option',
    icon: Smartphone,
    hardware: 'Brother P-Touch EDGE PT-E310BTVP',
    bestFor:
      'Printing tags straight from a phone/tablet via Bluetooth over USB-C charging.',
    recommendedMedia:
      'Brother TZe Strong Adhesive Laminated Tape (18mm or 24mm).',
  },
  {
    id: 'front-office-desk',
    tierLabel: 'The Front Office / Shop Desk Option',
    icon: Printer,
    hardware:
      'Industrial Desktop Thermal Transfer Printer (e.g., LabelTac 4 or Zebra benchtop equivalent)',
    bestFor:
      'High-volume shop intake; printing 2" to 3" square branded asset tags (including shop logo, phone number, and QR code).',
    recommendedMedia: 'Outdoor Vinyl Supply Rolls + Resin Ribbon.',
  },
];

export default function RecommendedHardwareSection() {
  return (
    <section
      id="recommended-hardware"
      aria-labelledby="recommended-hardware-title"
      className="bg-background py-16 sm:py-20"
    >
      <div className="container mx-auto max-w-6xl px-4">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Built for Weather &amp; Grease</span>
          </div>
          <h2
            id="recommended-hardware-title"
            className="text-2xl font-bold text-foreground sm:text-3xl"
          >
            Ready for the Field: Recommended Hardware
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            No proprietary tags or locked-in label contracts. Start testing on plain
            paper today, and print weather-proof outdoor vinyl tags when your fleet goes
            live.
          </p>
        </div>

        {/* Low-barrier paper testing callout */}
        <LandingReveal>
          <div
            className="mb-8 flex flex-col items-start justify-between gap-4 rounded-2xl border border-primary/30 bg-primary/5 px-5 py-4 sm:flex-row sm:items-center"
            data-testid="hardware-paper-testing-callout"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <FileText className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-foreground sm:text-base">
                  Start testing immediately on plain paper — zero hardware required
                </h3>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  Every QR code generated in EquipQR works with any office printer or cab
                  binder for pilot testing. When you&apos;re ready to tag machines exposed
                  to UV, rain, pressure washing, and diesel, use thermal transfer or
                  laminated outdoor vinyl below.
                </p>
              </div>
            </div>
          </div>
        </LandingReveal>

        {/* Three Recommended Hardware Tiers */}
        <ul
          aria-label="Recommended label printers and media"
          className="grid grid-cols-1 gap-6 md:grid-cols-3"
        >
          {HARDWARE_TIERS.map(
            (
              { id, tierLabel, icon: Icon, hardware, bestFor, recommendedMedia },
              index,
            ) => (
              <li key={id} className="list-none">
                <LandingReveal delayMs={index * 70}>
                  <div
                    className="flex h-full flex-col justify-between rounded-3xl border border-border/70 bg-muted/15 p-6 shadow-sm shadow-primary/5"
                    data-testid={`hardware-tier-${id}`}
                  >
                    <div>
                      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        <span>{tierLabel}</span>
                      </div>

                      <h3 className="text-lg font-semibold leading-snug text-foreground">
                        {hardware}
                      </h3>

                      <dl className="mt-4 space-y-3 text-sm">
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Best For
                          </dt>
                          <dd className="mt-0.5 leading-relaxed text-foreground">
                            {bestFor}
                          </dd>
                        </div>

                        <div className="rounded-xl border border-border/60 bg-background/80 p-3">
                          <dt className="text-xs font-semibold uppercase tracking-wide text-primary">
                            Recommended Media
                          </dt>
                          <dd className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                            {recommendedMedia}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </LandingReveal>
              </li>
            ),
          )}
        </ul>
      </div>
    </section>
  );
}
