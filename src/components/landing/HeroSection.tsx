import { Button } from '@/components/ui/button';
import { ArrowRight, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from '@/components/ui/Logo';
import { ExternalLink } from '@/components/ui/external-link';

const HeroSection = () => {
  return (
    <section className="relative flex flex-col items-center justify-center pt-24 pb-16 md:pt-28 md:pb-20 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container relative z-10 px-4 mx-auto">
        <div className="text-center max-w-4xl mx-auto">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <Logo size="xl" className="h-16 w-auto" />
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-4">
            Stop Losing Revenue to Lost Equipment
          </h1>

          {/* Subheadline */}
          <p className="text-xl sm:text-2xl text-muted-foreground mb-6 max-w-3xl mx-auto">
            Track equipment, manage work orders, and run your shop — all from one platform.
          </p>

          {/* CTAs — above screenshot so they stay above the fold */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Button asChild size="lg" className="text-lg px-8 py-6">
              <Link to="/auth?tab=signup">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 border-foreground/30 text-foreground hover:bg-foreground/10"
            >
              <a href="https://calendly.com/equipqr" target="_blank" rel="noopener noreferrer">
                <Calendar className="mr-2 h-5 w-5" aria-hidden />
                Schedule a Demo
              </a>
            </Button>
          </div>

          {/* Dashboard Screenshot — constrained height so it doesn't push CTAs below fold */}
          <div className="mb-8 flex justify-center">
            <div className="w-full max-w-5xl rounded-xl border border-background/10 bg-background/50 backdrop-blur-sm shadow-2xl shadow-primary/10 overflow-hidden h-[32vh] sm:h-[36vh] md:h-[34vh]">
              <img
                src="https://supabase.equipqr.app/storage/v1/object/public/landing-page-images/equipqr-banner-image.jpg"
                alt="EquipQR Dashboard - Equipment tracking and management platform"
                className="w-full h-full object-cover object-top"
                loading="eager"
              />
            </div>
          </div>

          {/* Trust Signal - Pill Badge */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background/5 backdrop-blur-sm border border-background/10 text-sm text-muted-foreground">
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
