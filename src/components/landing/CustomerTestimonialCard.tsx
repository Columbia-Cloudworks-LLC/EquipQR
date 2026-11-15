import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from '@/components/ui/external-link';
import { cn } from '@/lib/utils';
import LandingReveal from './LandingReveal';

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

interface CustomerTestimonialCardProps {
  className?: string;
  /** Fade each result tile in as it scrolls into view. */
  revealResults?: boolean;
}

/**
 * The 3-A Equipment testimonial with its customer results, shared by the
 * landing page and the Repair Shops solution page.
 */
export function CustomerTestimonialCard({ className, revealResults = false }: CustomerTestimonialCardProps) {
  return (
    <Card className={cn('max-w-3xl border-primary/20 bg-primary/5', className)}>
      <CardContent className="p-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="shrink-0">
            <img
              src="/images/brand/logos/3A-Equipment-Logo-Medium.png"
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
          {customerResults.map((result, index) => {
            const tile = (
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
            );
            return (
              <li key={result.label} className="list-none">
                {revealResults ? <LandingReveal delayMs={index * 80}>{tile}</LandingReveal> : tile}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
