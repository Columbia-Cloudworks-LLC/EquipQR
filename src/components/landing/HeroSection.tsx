import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import { ArrowDown, ArrowRight, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from '@/components/ui/Logo';
import { ExternalLink } from '@/components/ui/external-link';

const heroScreenshots = [
  {
    imageUrl:
      'https://supabase.equipqr.app/storage/v1/object/public/landing-page-images/mobile-work-order-1.png',
    imageAlt: 'EquipQR mobile work order screen with status, details, and technician actions',
    title: 'Mobile work orders in the field',
    description:
      'Open the right job from a phone, update status on-site, and keep work moving without calling back to the office.',
  },
  {
    imageUrl:
      'https://supabase.equipqr.app/storage/v1/object/public/landing-page-images/equipment-details-at-a-glance.png',
    imageAlt: 'EquipQR equipment detail page with equipment history, details, and maintenance context',
    title: 'Machine history without the hunt',
    description:
      'A single scan brings up service history, machine details, and current work context so the team always has the full record.',
  },
  {
    imageUrl:
      'https://supabase.equipqr.app/storage/v1/object/public/landing-page-images/generate-and-print-qr-labels.png',
    imageAlt: 'EquipQR QR label generation modal with download and print actions',
    title: 'Generate and print labels fast',
    description:
      'Create QR labels in minutes, print them, and turn every machine into a scannable entry point for work orders and proof.',
  },
];

const heroSlideIndices = heroScreenshots.map((_, index) => index);

const HeroSection = () => {
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState(heroSlideIndices);

  const syncCarouselState = useCallback((api: CarouselApi) => {
    const updateState = () => {
      setActiveSlideIndex(api.selectedScrollSnap());
      const nextScrollSnaps = api.scrollSnapList();
      setScrollSnaps(nextScrollSnaps.length > 0 ? nextScrollSnaps : heroSlideIndices);
    };

    if (typeof window === 'undefined') {
      updateState();
      return;
    }

    window.requestAnimationFrame(updateState);
  }, []);

  useEffect(() => {
    if (!carouselApi) {
      return;
    }

    syncCarouselState(carouselApi);
    carouselApi.on('settle', syncCarouselState);
    carouselApi.on('reInit', syncCarouselState);

    return () => {
      carouselApi.off('settle', syncCarouselState);
      carouselApi.off('reInit', syncCarouselState);
    };
  }, [carouselApi, syncCarouselState]);

  const goToSlide = useCallback(
    (index: number) => {
      carouselApi?.scrollTo(index);
    },
    [carouselApi]
  );

  return (
    <section className="relative flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 pt-24 pb-14 md:pt-28 md:pb-20">
      <div className="container relative z-10 px-4 mx-auto">
        <div className="text-center max-w-4xl mx-auto">
          {/* Early access ribbon */}
          <div className="mb-6 flex justify-center">
            <p
              role="note"
              className="inline-flex max-w-3xl items-center justify-center rounded-full border border-primary/50 bg-primary/15 px-4 py-2 text-left text-xs leading-relaxed text-foreground shadow-lg shadow-primary/10 break-words sm:text-center sm:text-sm"
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
          <p className="mx-auto mb-6 max-w-3xl break-words text-left text-xl font-medium leading-relaxed text-muted-foreground sm:text-center sm:text-2xl">
            QR codes on every machine. Your team logs work from their phone. QuickBooks gets the invoice automatically.
          </p>

          {/* CTAs — above screenshot so they stay above the fold */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Button asChild size="lg" className="w-full text-lg px-8 py-6 shadow-lg shadow-primary/20 sm:w-auto">
              <Link to="/auth?tab=signup" className="inline-flex w-full items-center justify-center gap-2 text-center break-words">
                Get Started Free
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              className="min-h-11 w-full rounded-full border border-primary/20 bg-background/45 px-4 py-3 text-sm font-medium text-primary/80 backdrop-blur hover:bg-primary/10 hover:text-foreground sm:w-auto"
            >
              <a
                href="#customers"
                aria-label="Jump to customer proof and testimonials"
                className="inline-flex w-full items-center justify-center gap-2 text-center break-words"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden />
                See How Shops Use EquipQR
                <ArrowDown className="h-4 w-4" aria-hidden />
              </a>
            </Button>
          </div>

          <p className="mb-8 text-left text-sm text-muted-foreground sm:text-center">
            No credit card required. Most shops scan their first machine in under 20 minutes.
          </p>

          {/* Product preview carousel */}
          <div className="mb-8 flex justify-center">
            <div className="w-full max-w-5xl">
              <Carousel
                aria-label="EquipQR product preview"
                className="rounded-[1.75rem] border border-primary/15 bg-background/65 p-3 shadow-2xl shadow-primary/10 backdrop-blur-sm"
                opts={{ align: 'start', loop: false }}
                setApi={setCarouselApi}
              >
                <CarouselContent className="-ml-0">
                  {heroScreenshots.map((slide, index) => (
                    <CarouselItem
                      key={slide.title}
                      aria-label={`Slide ${index + 1} of ${heroScreenshots.length}: ${slide.title}`}
                      className="pl-0"
                    >
                      <figure className="grid gap-4 md:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.75fr)]">
                        <div className="overflow-hidden rounded-[1.25rem] border border-border/70 bg-background/70">
                          <img
                            src={slide.imageUrl}
                            alt={slide.imageAlt}
                            className="h-[34vh] w-full object-cover object-top sm:h-[38vh] md:h-[24rem]"
                            loading={index === 0 ? 'eager' : 'lazy'}
                            decoding="async"
                            fetchPriority={index === 0 ? 'high' : 'low'}
                            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 1024px"
                          />
                        </div>
                        <figcaption className="flex flex-col justify-between rounded-[1.25rem] border border-primary/15 bg-background/90 p-5 text-left">
                          <div>
                            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-primary/80">
                              Swipe-ready mobile workflow
                            </p>
                            <h2 className="mt-3 text-xl font-semibold text-foreground sm:text-2xl">
                              {slide.title}
                            </h2>
                            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                              {slide.description}
                            </p>
                          </div>
                          <p className="mt-4 inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted-foreground md:hidden">
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                            Swipe to explore
                          </p>
                        </figcaption>
                      </figure>
                    </CarouselItem>
                  ))}
                </CarouselContent>

                <CarouselPrevious
                  className="left-4 top-4 h-9 w-9 translate-y-0 border-primary/20 bg-background/85 text-foreground shadow-lg shadow-background/40 backdrop-blur hover:bg-background"
                  variant="outline"
                />
                <CarouselNext
                  className="right-4 top-4 h-9 w-9 translate-y-0 border-primary/20 bg-background/85 text-foreground shadow-lg shadow-background/40 backdrop-blur hover:bg-background"
                  variant="outline"
                />

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-left text-sm leading-relaxed text-muted-foreground">
                    {heroScreenshots[activeSlideIndex]?.description}
                  </p>
                  <div className="flex items-center gap-2">
                    {scrollSnaps.map((_, index) => {
                      const isActive = index === activeSlideIndex;

                      return (
                        <button
                          key={heroScreenshots[index]?.title ?? index}
                          type="button"
                          aria-label={`Show slide ${index + 1}: ${heroScreenshots[index]?.title ?? 'Product preview'}`}
                          aria-pressed={isActive}
                          className={[
                            'h-2.5 rounded-full transition-all duration-300',
                            isActive
                              ? 'w-8 bg-primary shadow-lg shadow-primary/30'
                              : 'w-2.5 bg-muted-foreground/35 hover:bg-muted-foreground/65',
                          ].join(' ')}
                          onClick={() => goToSlide(index)}
                        />
                      );
                    })}
                  </div>
                </div>
              </Carousel>
            </div>
          </div>

          {/* Trust Signal - Pill Badge */}
          <div className="flex justify-center">
            <div className="inline-flex max-w-3xl flex-wrap items-center justify-start gap-2 rounded-full border border-background/10 bg-background/5 px-4 py-2 text-left text-sm leading-relaxed text-muted-foreground backdrop-blur-sm sm:justify-center sm:text-center">
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
