import { History, ScanLine, Receipt, UserCheck, KeyRound } from 'lucide-react';

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
      className="py-10 sm:py-12 bg-background"
    >
      <div className="container px-4 mx-auto max-w-5xl">
        <h2
          id="why-different-title"
          className="text-2xl sm:text-3xl font-semibold text-foreground mb-6 text-center"
        >
          Why EquipQR is Different
        </h2>
        <ul className="space-y-4 max-w-4xl mx-auto" role="list">
          {bullets.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex min-w-0 items-start gap-3">
              <Icon className="h-5 w-5 text-primary mt-0.5 shrink-0" aria-hidden />
              <span className="min-w-0 text-sm leading-relaxed text-foreground break-words sm:text-base">
                <strong>{title}</strong> &mdash; {text}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
