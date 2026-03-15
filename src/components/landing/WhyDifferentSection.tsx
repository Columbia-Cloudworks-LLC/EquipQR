import { ShieldCheck, Users, Building2, MapPin, Receipt } from 'lucide-react';

const bullets = [
  {
    icon: ShieldCheck,
    text: 'Secure QR codes with role-based access. If someone scans without permission, they sign in and still see access denied.',
  },
  {
    icon: Users,
    text: 'Control access by team today. Coming soon: managers and org admins can approve access requests.',
  },
  {
    icon: Building2,
    text: 'Invite customers, import staff from Google Workspace, and let users sign in with Google.',
  },
  {
    icon: MapPin,
    text: 'Log every scan with who and when, plus optional location so you can map where assets are scanned.',
  },
  {
    icon: Receipt,
    text: 'Start with real-shop PM templates, clone them per shop, and export completed work to QuickBooks draft invoices in one click.',
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
          {bullets.map(({ icon: Icon, text }) => (
            <li key={text} className="flex min-w-0 items-start gap-3">
              <Icon className="h-5 w-5 text-primary mt-0.5 shrink-0" aria-hidden />
              <span className="min-w-0 text-sm leading-relaxed text-foreground break-words sm:text-base">{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
