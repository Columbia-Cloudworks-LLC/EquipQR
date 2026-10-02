import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type KeyboardEvent,
} from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { cn } from '@/lib/utils';
import { HeroSlideFrame } from './HeroSlideFrame';
import { HERO_SLIDES } from './heroSlides';
import {
  HERO_GALLERY_FADE_MS,
  HERO_GALLERY_HOLD_MS,
  HERO_GALLERY_MANUAL_PAUSE_MS,
  type HeroSlideDefinition,
} from './types';

interface HeroGalleryProps {
  slides?: HeroSlideDefinition[];
}

interface GalleryLayer {
  index: number;
  opacity: number;
}

function nextTabIndex(key: string, index: number, length: number): number | null {
  if (key === 'ArrowRight' || key === 'ArrowDown') return (index + 1) % length;
  if (key === 'ArrowLeft' || key === 'ArrowUp') return (index - 1 + length) % length;
  if (key === 'Home') return 0;
  if (key === 'End') return length - 1;
  return null;
}

export function HeroGallery({ slides = HERO_SLIDES }: HeroGalleryProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [layers, setLayers] = useState<GalleryLayer[]>([{ index: 0, opacity: 1 }]);
  const activeIndexRef = useRef(0);
  const pausedRef = useRef(false);
  const pauseUntilRef = useRef(0);
  const holdTimerRef = useRef<number | null>(null);
  const fadeTimerRef = useRef<number | null>(null);
  const fadeRafRef = useRef<number[]>([]);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const clearTimers = useCallback(() => {
    if (holdTimerRef.current !== null) clearTimeout(holdTimerRef.current);
    if (fadeTimerRef.current !== null) clearTimeout(fadeTimerRef.current);
    holdTimerRef.current = null;
    fadeTimerRef.current = null;
    for (const id of fadeRafRef.current) cancelAnimationFrame(id);
    fadeRafRef.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    const next = slides[(activeIndex + 1) % slides.length];
    if (next) void next.preload();
  }, [activeIndex, slides]);

  const goTo = useCallback((nextIndex: number, reason: 'auto' | 'manual') => {
    if (slides.length === 0) return;
    const normalized = ((nextIndex % slides.length) + slides.length) % slides.length;
    const current = activeIndexRef.current;
    if (normalized === current) return;
    if (reason === 'auto' && (pausedRef.current || Date.now() < pauseUntilRef.current)) return;

    if (reason === 'manual') {
      pauseUntilRef.current = Date.now() + HERO_GALLERY_MANUAL_PAUSE_MS;
    }

    clearTimers();
    activeIndexRef.current = normalized;
    setActiveIndex(normalized);

    if (prefersReducedMotion) {
      setLayers([{ index: normalized, opacity: 1 }]);
      return;
    }

    setLayers([
      { index: current, opacity: 1 },
      { index: normalized, opacity: 0 },
    ]);
    const firstFrame = requestAnimationFrame(() => {
      const secondFrame = requestAnimationFrame(() => {
        setLayers([
          { index: current, opacity: 0 },
          { index: normalized, opacity: 1 },
        ]);
      });
      fadeRafRef.current.push(secondFrame);
    });
    fadeRafRef.current.push(firstFrame);
    fadeTimerRef.current = setTimeout(() => {
      fadeTimerRef.current = null;
      setLayers([{ index: normalized, opacity: 1 }]);
    }, HERO_GALLERY_FADE_MS);
  }, [clearTimers, prefersReducedMotion, slides.length]);

  const handleLoopComplete = useCallback((index: number) => {
    if (prefersReducedMotion || pausedRef.current || slides.length < 2) return;
    if (index !== activeIndexRef.current) return;
    if (Date.now() < pauseUntilRef.current) return;
    if (holdTimerRef.current !== null) return;
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      goTo(activeIndexRef.current + 1, 'auto');
    }, HERO_GALLERY_HOLD_MS);
  }, [goTo, prefersReducedMotion, slides.length]);

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = nextTabIndex(event.key, index, slides.length);
    if (next === null) return;
    event.preventDefault();
    goTo(next, 'manual');
    const nextSlide = slides[next];
    if (!nextSlide) return;
    document.getElementById(`hero-tab-${nextSlide.id}`)?.focus();
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') return;
    swipeStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
    goTo(activeIndexRef.current + (dx < 0 ? 1 : -1), 'manual');
  };

  const activeSlide = slides[activeIndex];

  return (
    <section
      aria-label="EquipQR workflow gallery"
      className="relative flex flex-col items-center justify-center bg-linear-to-br from-background via-background to-primary/5 pb-14 pt-24 md:pb-20 md:pt-28"
    >
      <p className="sr-only">
        EquipQR shows how QR-coded equipment is tracked and serviced. The headline stays in place
        while stories change underneath. Fleet observability turns a scan into a map of assets and
        work orders. Scan one machine opens that equipment&apos;s identity, work order, and service
        history.
      </p>

      <div className="relative z-10 mb-8 px-4 text-center">
        <h1
          data-route-heading="true"
          tabIndex={-1}
          className="text-2xl font-bold tracking-tight text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:text-3xl lg:text-4xl"
        >
          QR-tracked work orders for heavy equipment repair shops
        </h1>
      </div>

      <div className="z-10 mb-8 flex flex-col items-center gap-3 px-4">
        <Button asChild size="lg" className="px-7 py-5 text-base">
          <Link to="/auth?tab=signup">
            Get Started Free
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">
          No credit card. First scan in 20 minutes.
        </p>
      </div>

      <div
        className="relative w-full max-w-sm touch-pan-y overflow-hidden px-4 sm:max-w-[480px]"
        style={{ aspectRatio: '1 / 1', minHeight: 320 }}
        data-testid="hero-gallery-stage"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        {layers.map((layer) => {
          const slide = slides[layer.index];
          if (!slide) return null;
          const panelId = `hero-slide-${slide.id}`;
          const isActive = layer.index === activeIndex;
          return (
            <div
              key={`${slide.id}-${layer.index}`}
              id={isActive ? panelId : undefined}
              role="tabpanel"
              aria-labelledby={`hero-tab-${slide.id}`}
              aria-hidden={isActive ? undefined : true}
              className={cn(
                'absolute inset-0 transition-opacity ease-out motion-reduce:transition-none',
                prefersReducedMotion ? 'duration-0' : 'duration-500',
              )}
              style={{ opacity: layer.opacity }}
            >
              {isActive ? <p className="sr-only">{slide.description}</p> : null}
              <HeroSlideFrame
                slide={slide}
                reducedMotion={prefersReducedMotion}
                onLoopComplete={() => handleLoopComplete(layer.index)}
              />
            </div>
          );
        })}
      </div>

      {slides.length > 1 ? (
        <div className="mt-4 flex flex-col items-center gap-1">
          <div role="tablist" aria-label="Workflow stories" className="flex items-center justify-center">
            {slides.map((slide, index) => {
              const selected = index === activeIndex;
              return (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  id={`hero-tab-${slide.id}`}
                  aria-controls={`hero-slide-${slide.id}`}
                  aria-selected={selected}
                  tabIndex={selected ? 0 : -1}
                  className="flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => goTo(index, 'manual')}
                  onKeyDown={(event) => onTabKeyDown(event, index)}
                >
                  <span
                    className={cn(
                      'block h-2 rounded-full bg-primary transition-all',
                      selected ? 'w-6 opacity-100' : 'w-2 opacity-40',
                    )}
                  />
                  <span className="sr-only">{slide.label}</span>
                </button>
              );
            })}
          </div>
          {activeSlide ? (
            <p className="text-xs text-muted-foreground" aria-hidden="true">
              {activeSlide.label}
            </p>
          ) : null}
          {prefersReducedMotion ? null : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-pressed={paused}
              onClick={() => {
                setPaused((value) => {
                  if (!value) clearTimers();
                  return !value;
                });
              }}
            >
              {paused ? 'Play stories' : 'Pause stories'}
            </Button>
          )}
        </div>
      ) : null}
    </section>
  );
}
