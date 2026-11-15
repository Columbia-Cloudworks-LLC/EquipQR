import React from 'react';
import { Shield, Smartphone, Building2, Receipt } from 'lucide-react';
import LandingReveal from './LandingReveal';
import { CustomerTestimonialCard } from './CustomerTestimonialCard';

const trustBadges = [
  { icon: Shield, label: 'Your Data Stays Private' },
  { icon: Smartphone, label: 'Offline-Ready Mobile' },
  { icon: Building2, label: 'Google Workspace SSO' },
  { icon: Receipt, label: 'QuickBooks Integration' },
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
                src="/images/brand/logos/3A-Equipment-Logo-Medium.png"
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
          <CustomerTestimonialCard revealResults />
        </div>

        {/* Qualitative trust badges - verifiable feature claims */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {trustBadges.map(({ icon: Icon, label }, index) => (
            <LandingReveal key={label} delayMs={index * 60}>
              <div className="flex items-center gap-3 rounded-lg border border-border bg-card/50 px-4 py-3">
                <Icon className="h-6 w-6 text-primary shrink-0" aria-hidden />
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