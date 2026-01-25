import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from '@/components/ui/Logo';
import { ExternalLink } from '@/components/ui/external-link';

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,transparent,black)] dark:bg-grid-slate-800"></div>
      
      <div className="container relative z-10 px-4 mx-auto">
        <div className="text-center max-w-4xl mx-auto">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Logo size="xl" className="h-16 w-auto" />
          </div>
          
          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6">
            Stop Losing Revenue to Lost Equipment
          </h1>
          
          {/* Subheadline */}
          <p className="text-xl sm:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            The enterprise-grade platform for repair shops and rental operations. Track equipment with QR codes, manage inventory and parts, handle work orders, and organize your team efficiently.
          </p>
          
          {/* Dashboard Screenshot Placeholder */}
          <div className="mb-10 flex justify-center">
            <div className="w-full max-w-5xl aspect-video rounded-xl border border-white/10 bg-background/50 backdrop-blur-sm shadow-2xl shadow-primary/10">
              {/* Placeholder for UI dashboard screenshot */}
            </div>
          </div>
          
          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
            <Button asChild size="lg" className="text-lg px-8 py-6">
              <Link to="/auth">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-lg px-8 py-6">
              <Link to="#about">
                How It Works
              </Link>
            </Button>
          </div>
          
          {/* Trust Signal - Pill Badge */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Field-tested solution</span>
              <span>•</span>
              <span>
                <span className="font-semibold text-foreground">Currently deployed</span> at{' '}
                <ExternalLink 
                  href="https://3aequip.com"
                  className="text-primary hover:text-primary/80 transition-colors"
                >
                  3-A Equipment
                </ExternalLink>
                , a heavy equipment repair shop
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;