import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Calendar, ArrowRight } from 'lucide-react';

const DEMO_CALENDLY_URL = 'https://calendly.com/nicholas-king-columbiacloudworks/30min';
const CONTACT_EMAIL = 'mailto:nicholas.king@columbiacloudworks.com';

const PricingSection = () => {
  return (
    <section id="pricing" className="scroll-mt-20 py-24 bg-muted/40">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Enterprise-grade platform with unlimited users. Start free, scale as you grow.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
            <div className="text-center mb-8 pb-6 border-b border-border">
              <div className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight">Free to start</div>
              <p className="text-muted-foreground mt-2">No credit card required. Scale with custom plans when you need more.</p>
            </div>
            <ul className="space-y-3 mb-8 text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="text-primary font-medium">✓</span>
                Unlimited user seats
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary font-medium">✓</span>
                5 GB image storage included
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary font-medium">✓</span>
                Enterprise RLS security
              </li>
            </ul>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button asChild size="lg" className="text-lg px-6 py-6 w-full sm:w-auto">
                <a href={DEMO_CALENDLY_URL} target="_blank" rel="noopener noreferrer">
                  <Calendar className="mr-2 h-5 w-5" aria-hidden />
                  Schedule a Demo
                </a>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-6 py-6 w-full sm:w-auto">
                <Link to="/auth?tab=signup">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>

            <p className="text-sm text-muted-foreground text-center mt-4">
              or{' '}
              <a
                href={CONTACT_EMAIL}
                className="text-primary hover:text-primary/80 transition-colors underline underline-offset-2"
              >
                contact us directly
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
