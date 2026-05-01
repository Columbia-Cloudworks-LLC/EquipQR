import { Link } from 'react-router-dom';
import {
  QrCode,
  Building2,
  Receipt,
  ClipboardList,
  Users,
  Map,
  UserCircle,
  FileCheck,
  Warehouse,
  Search,
  Smartphone,
  Shield,
  ArrowRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import LandingReveal from './LandingReveal';

interface PillarFeature {
  icon: LucideIcon;
  title: string;
  description: string;
  link: string;
}

interface Pillar {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  accentClass: string;
  dotClass: string;
  features: PillarFeature[];
}

const pillars: Pillar[] = [
  {
    id: 'field',
    title: 'Field Operations',
    subtitle: 'Technicians scan, inspect, document, and close work faster',
    description:
      'Give your crew everything they need at the machine — scan to pull history, create work orders, complete PM checklists, and capture photos from their phone.',
    accentClass: 'text-primary',
    dotClass: 'bg-primary',
    features: [
      {
        icon: QrCode,
        title: 'QR Code Integration',
        description: 'Scan any machine to instantly pull its full service history and start a work order.',
        link: '/features/qr-code-integration',
      },
      {
        icon: Smartphone,
        title: 'Mobile-First Design',
        description: 'Touch-optimized for phones and tablets. Works offline in the field.',
        link: '/features/mobile-first-design',
      },
      {
        icon: ClipboardList,
        title: 'Work Order Management',
        description: 'Create, assign, track, and close work orders with clear statuses and due dates.',
        link: '/features/work-order-management',
      },
      {
        icon: FileCheck,
        title: 'PM Templates',
        description: 'Built-in checklists for forklifts, excavators, scissor lifts, trailers, and more.',
        link: '/features/pm-templates',
      },
    ],
  },
  {
    id: 'backoffice',
    title: 'Back Office',
    subtitle: 'Owners reduce double entry, billing delays, and parts chaos',
    description:
      'Connect your accounting, organize your customers, track your parts, and eliminate manual re-entry between your field work and your books.',
    accentClass: 'text-success',
    dotClass: 'bg-success',
    features: [
      {
        icon: Receipt,
        title: 'QuickBooks',
        description: 'Export completed work orders as QuickBooks draft invoices in one click.',
        link: '/features/quickbooks',
      },
      {
        icon: UserCircle,
        title: 'Customer CRM',
        description: 'Link equipment to customers. Permanent service history per client asset.',
        link: '/features/customer-crm',
      },
      {
        icon: Warehouse,
        title: 'Inventory Management',
        description: 'Track parts and supplies with stock levels, low-stock alerts, and audit history.',
        link: '/features/inventory',
      },
      {
        icon: Search,
        title: 'Part Lookup & Alternates',
        description: 'Find parts fast. Discover approved substitutes when preferred stock runs out.',
        link: '/features/part-lookup-alternates',
      },
    ],
  },
  {
    id: 'control',
    title: 'Control & Trust',
    subtitle: 'Managers govern access, see work, and prove who did what',
    description:
      "Role-based access, audit-ready scan logs, Google Workspace single sign-on, and a fleet map to see every machine's last confirmed location.",
    accentClass: 'text-info',
    dotClass: 'bg-info',
    features: [
      {
        icon: Users,
        title: 'Team Collaboration',
        description: 'Org and team roles control who sees what. Every action is attributed.',
        link: '/features/team-collaboration',
      },
      {
        icon: Building2,
        title: 'Google Workspace',
        description: 'Import users from your directory. Sign in with existing Google accounts.',
        link: '/features/google-workspace',
      },
      {
        icon: Map,
        title: 'Fleet Visualization',
        description: "See every machine's last confirmed location on an interactive map.",
        link: '/features/fleet-visualization',
      },
      {
        icon: Shield,
        title: 'Enterprise Security',
        description: 'Row-level security enforces tenant isolation. Every scan logged with name and time.',
        link: '/security',
      },
    ],
  },
];

const FeaturesSection = ({ id }: { id?: string }) => {
  return (
    <section id={id} className="scroll-mt-20 py-20 bg-background">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Everything Your Shop Needs, Organized Around How Work Actually Flows
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            From the QR code on the machine to the invoice in QuickBooks &mdash; one platform your whole team
            actually uses.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {pillars.map((pillar, pillarIndex) => (
            <LandingReveal key={pillar.id} delayMs={pillarIndex * 80}>
              <div className="flex flex-col h-full rounded-2xl border border-border bg-card/60 shadow-sm overflow-hidden">
                {/* Pillar header */}
                <div className="px-6 pt-8 pb-6 border-b border-border/60">
                  <h3 className={`text-xl font-bold mb-1 ${pillar.accentClass}`}>{pillar.title}</h3>
                  <p className="text-sm font-medium text-foreground mb-3">{pillar.subtitle}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{pillar.description}</p>
                </div>

                {/* Feature list */}
                <ul className="flex flex-col flex-grow px-6 py-5 space-y-4" role="list">
                  {pillar.features.map((feature) => (
                    <li key={feature.title} className="list-none">
                      <Link
                        to={feature.link}
                        className="group flex items-start gap-3 rounded-xl p-3 -mx-3 hover:bg-muted/60 transition-colors"
                      >
                        <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background/80`}>
                          <feature.icon className={`h-4 w-4 ${pillar.accentClass}`} aria-hidden />
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                              {feature.title}
                            </span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground leading-relaxed">
                            {feature.description}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </LandingReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
