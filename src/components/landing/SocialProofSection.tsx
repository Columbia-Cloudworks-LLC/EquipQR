import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from '@/components/ui/external-link';
import { Shield, Smartphone, Building2, Receipt } from 'lucide-react';
import LandingReveal from './LandingReveal';

const trustBadges = [
  { icon: Shield, label: 'Your Data Stays Private' },
  { icon: Smartphone, label: 'Offline-Ready Mobile' },
  { icon: Building2, label: 'Google Workspace SSO' },
  { icon: Receipt, label: 'QuickBooks Integration' },
];

const customerResults = [
  {
    value: '100%',
    label: 'Field adoption',
    description: 'Every technician on the team uses EquipQR daily.',
  },
  {
    value: '50%',
    label: 'Faster close times',
    description: 'Work orders close faster after moving the process into EquipQR.',
  },
];

const SocialProofSection = () => {
  return (
    <section id="customers" className="scroll-mt-20 py-24 bg-background">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Trusted by Equipment Teams
          </h2>
          <p className="mx-auto max-w-2xl text-left text-xl text-muted-foreground sm:text-center">
            Currently deployed at heavy equipment repair shops who rely on EquipQR™ for their daily operations.
          </p>
        </div>

        {/* Trusted-by strip — quick scan before the main testimonial */}
        <LandingReveal>
          <div className="mb-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 rounded-xl border border-border/50 bg-muted/30 px-4 py-6">
            <span className="text-sm font-medium text-muted-foreground">Trusted by teams at</span>
            <div className="flex items-center gap-3">
              <img
                src="/branded-logos/3A-Equipment-Logo-Medium.png"
                alt=""
                className="h-10 w-auto object-contain opacity-90"
                aria-hidden
              />
              <span className="text-sm font-semibold text-foreground">3-A Equipment</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-sm text-muted-foreground">Heavy equipment repair</span>
            </div>
          </div>
        </LandingReveal>

        <div className="flex justify-center mb-16">
          {/* Primary Client Highlight - Centered */}
          <Card className="max-w-3xl border-primary/20 bg-primary/5">
            <CardContent className="p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0">
                  <img
                    src="/branded-logos/3A-Equipment-Logo-Medium.png"
                    alt="3-A Equipment Logo"
                    className="h-20 w-20 object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">
                    <ExternalLink
                      href="https://3aequip.com"
                      className="text-primary hover:text-primary/80 transition-colors"
                    >
                      3-A Equipment
                    </ExternalLink>
                  </h3>
                  <Badge variant="secondary" className="mb-4">Heavy Equipment Repair Shop</Badge>
                  <p className="text-muted-foreground leading-relaxed">
                    &ldquo;We used to track PMs on paper and hope nothing slipped through. Now every machine has a QR code &mdash; scanning it proves exactly where it was dropped off and pulls up the full inspection history. I can see at a glance that every item was checked for defects, and so can my customers.&rdquo;
                  </p>
                  <p className="text-sm font-medium text-foreground mt-3">
                    &mdash; Matt Hankins, Owner, 3-A Equipment
                  </p>
                </div>
              </div>

              <ul
                aria-label="Customer results"
                className="grid grid-cols-1 gap-4 border-t border-border pt-6 sm:grid-cols-2"
              >
                {customerResults.map((result, index) => (
                  <li key={result.label} className="list-none">
                    <LandingReveal delayMs={index * 80}>
                      <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-left shadow-sm shadow-primary/10">
                        <p className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">
                          {result.value}
                        </p>
                        <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-foreground/90">
                          {result.label}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {result.description}
                        </p>
                      </div>
                    </LandingReveal>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Qualitative trust badges - verifiable feature claims */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {trustBadges.map(({ icon: Icon, label }, index) => (
            <LandingReveal key={label} delayMs={index * 60}>
              <div className="flex items-center gap-3 rounded-lg border border-border bg-card/50 px-4 py-3">
                <Icon className="h-6 w-6 text-primary flex-shrink-0" aria-hidden />
                <span className="text-sm font-medium text-foreground">{label}</span>
              </div>
            </LandingReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProofSection;