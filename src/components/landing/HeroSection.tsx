import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, QrCode, Shield, Smartphone } from 'lucide-react';
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
            Equipment Management Made Simple
          </h1>
          
          {/* Subheadline */}
          <p className="text-xl sm:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Perfect for repair shops and rental operations. Track equipment with QR codes, manage work orders, and coordinate your team. Start free - pay only $10/month per additional user.
          </p>
          
          {/* Key Features */}
          <div className="flex flex-wrap justify-center gap-6 mb-10">
            <div className="flex items-center gap-2 text-muted-foreground">
              <QrCode className="h-5 w-5 text-primary" />
              <span>QR Code Integration</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="h-5 w-5 text-primary" />
              <span>Enterprise RBAC</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Smartphone className="h-5 w-5 text-primary" />
              <span>Mobile-First Design</span>
            </div>
          </div>
          
          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild size="lg" className="text-lg px-8 py-6">
              <Link to="/auth">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
          
          {/* Trust Signal */}
          <div className="mt-12 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground mb-4">Field-tested solution</p>
            <div className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Currently deployed</span> at{' '}
              <ExternalLink 
                href="https://3aequip.columbiacloudworks.com/"
                className="text-primary hover:text-primary/80 transition-colors"
              >
                3-A Equipment
              </ExternalLink>
              , a heavy equipment repair shop
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;