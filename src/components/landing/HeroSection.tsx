import { Button } from '@/components/ui/button';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from '@/components/ui/Logo';
import { ExternalLink } from '@/components/ui/external-link';

const HeroSection = () => {
  return (
    <section className="relative flex flex-col items-center justify-center pt-24 pb-16 md:pt-28 md:pb-20 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container relative z-10 px-4 mx-auto">
        <div className="text-center max-w-4xl mx-auto">
          {/* Early access ribbon */}
          <div className="mb-6 flex justify-center">
            <p
              role="note"
              className="inline-flex max-w-3xl items-center justify-center rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-center text-xs leading-relaxed text-foreground break-words sm:text-sm"
            >
              Free during early access — limited spots available for heavy equipment repair shops.
            </p>
          </div>

          {/* Logo */}
          <div className="flex justify-center mb-6">
            <Logo size="xl" className="h-16 w-auto" />
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-4 break-words">
            From &ldquo;Who Worked on That Last?&rdquo; to a Full Service Record in One Scan
          </h1>

          {/* Subheadline */}
          <p className="text-xl sm:text-2xl text-muted-foreground mb-6 max-w-3xl mx-auto break-words">
            QR codes on every machine. Your team logs work from their phone. QuickBooks gets the invoice automatically.
          </p>

          {/* CTAs — above screenshot so they stay above the fold */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Button asChild size="lg" className="w-full sm:w-auto text-lg px-8 py-6">
              <Link to="/auth?tab=signup" className="inline-flex w-full items-center justify-center gap-2 text-center break-words">
                Start Tracking Free — No Credit Card
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              className="w-full sm:w-auto text-base text-muted-foreground hover:text-foreground"
            >
              <a
                href="#customers"
                aria-label="Jump to customer proof and testimonials"
                className="inline-flex w-full items-center justify-center gap-2 text-center break-words"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden />
                See How Shops Use EquipQR
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mb-8">
            No credit card required. Most shops scan their first machine in under 20 minutes.
          </p>

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
            <div className="inline-flex max-w-3xl flex-wrap items-center justify-center gap-2 rounded-full border border-background/10 bg-background/5 px-4 py-2 text-center text-sm leading-relaxed text-muted-foreground backdrop-blur-sm">
              <span className="font-semibold text-foreground">Field-tested solution</span>
              <span>•</span>
              <span className="break-words">
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
