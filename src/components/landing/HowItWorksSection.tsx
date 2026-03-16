import { Printer, ScanLine, FileCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

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
      className="py-16 sm:py-20 bg-muted/20"
    >
      <div className="container px-4 mx-auto max-w-5xl">
        <h2
          id="how-it-works-title"
          className="text-2xl sm:text-3xl font-bold text-foreground mb-10 text-center"
        >
          How It Works
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
          {steps.map(({ number, icon: Icon, title, description }) => (
            <div key={number} className="flex flex-col items-center text-center">
              <div className="relative mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold">
                  {number}
                </div>
                <Icon
                  className="absolute -bottom-1 -right-1 h-5 w-5 text-primary bg-background rounded-full p-0.5"
                  aria-hidden
                />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground max-w-xs">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
