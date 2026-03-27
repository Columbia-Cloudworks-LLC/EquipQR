import { Printer, ScanLine, FileCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import LandingReveal from './LandingReveal';

interface Step {
  number: number;
  icon: LucideIcon;
  title: string;
  description: string;
}

const steps: Step[] = [
  {
    number: 1,
    icon: Printer,
    title: 'Print & stick QR labels',
    description:
      'Generate labels in EquipQR and stick them on your machines. Takes minutes, not hours.',
  },
  {
    number: 2,
    icon: ScanLine,
    title: 'Techs scan on the job',
    description:
      'Your crew scans with their phone to pull up history, log work, or start a new work order.',
  },
  {
    number: 3,
    icon: FileCheck,
    title: 'Jobs close & invoices generate',
    description:
      'Completed work orders export to QuickBooks as draft invoices in one click.',
  },
];

export default function HowItWorksSection() {
  return (
    <section
      aria-labelledby="how-it-works-title"
      className="bg-muted/20 py-16 sm:py-20"
    >
      <div className="container px-4 mx-auto max-w-5xl">
        <h2
          id="how-it-works-title"
          className="text-2xl sm:text-3xl font-bold text-foreground mb-10 text-center"
        >
          How It Works
        </h2>

        <ol
          aria-label="How EquipQR works"
          className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6"
        >
          {steps.map(({ number, icon: Icon, title, description }, index) => (
            <li key={number} className="list-none">
              <LandingReveal delayMs={index * 70}>
                <div className="flex h-full flex-col items-center rounded-3xl border border-border/70 bg-background/70 px-5 py-6 text-center shadow-sm shadow-primary/5">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-2 text-left shadow-sm shadow-primary/10">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">
                      {number}
                    </span>
                    <Icon className="h-4 w-4 text-primary" aria-hidden />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">
                    {title}
                  </h3>
                  <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </div>
              </LandingReveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
