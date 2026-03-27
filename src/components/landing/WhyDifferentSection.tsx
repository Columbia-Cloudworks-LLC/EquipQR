import { History, ScanLine, Receipt, UserCheck, KeyRound } from 'lucide-react';
import LandingReveal from './LandingReveal';

const bullets = [
  {
    icon: History,
    title: 'One scan, full history',
    text: 'Any tech can pull up a machine\u2019s complete service record from their phone. No calling the office.',
  },
  {
    icon: ScanLine,
    title: 'Customers request work without calling you',
    text: 'They scan the QR on their machine, submit a job request, and it lands in your queue automatically.',
  },
  {
    icon: Receipt,
    title: 'Finished job \u2192 QuickBooks invoice in one click',
    text: 'Stop re-entering billable hours into your accounting software.',
  },
  {
    icon: UserCheck,
    title: 'You always know who touched what',
    text: 'Every scan is logged with name, time, and location. No more \u201CI don\u2019t know who worked on it last.\u201D',
  },
  {
    icon: KeyRound,
    title: 'Your team signs in with Google',
    text: 'No new passwords to forget. They use the same login they already have.',
  },
];

export default function WhyDifferentSection() {
  return (
    <section
      aria-labelledby="why-different-title"
      className="bg-background py-12 sm:py-14"
    >
      <div className="container px-4 mx-auto max-w-5xl">
        <h2
          id="why-different-title"
          className="text-2xl sm:text-3xl font-semibold text-foreground mb-6 text-center"
        >
          Why EquipQR is Different
        </h2>
        <ul className="mx-auto max-w-4xl space-y-4" role="list">
          {bullets.map(({ icon: Icon, title, text }, index) => (
            <li key={title} className="list-none">
              <LandingReveal delayMs={index * 60}>
                <div className="flex min-w-0 items-start gap-4 rounded-2xl border border-border/70 bg-background/60 px-4 py-4 text-left shadow-sm shadow-primary/5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary shadow-sm shadow-primary/10">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-foreground sm:text-lg">
                      {title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground break-words sm:text-base">
                      {text}
                    </p>
                  </div>
                </div>
              </LandingReveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
