import type { ComponentType, LazyExoticComponent } from 'react';

export interface HeroSlideProps {
  onLoopComplete: () => void;
}

type HeroSlideComponent =
  | ComponentType<HeroSlideProps>
  | LazyExoticComponent<ComponentType<HeroSlideProps>>;

/**
 * One independently registered hero story. Adding a future animation is a new
 * entry in the slide list: id, copy, preload, stage, reduced-motion frame, and
 * the fallback shown while that stage's chunk loads.
 */
export interface HeroSlideDefinition {
  id: string;
  label: string;
  description: string;
  preload: () => Promise<unknown>;
  Stage: HeroSlideComponent;
  StaticFrame: ComponentType;
  Fallback: ComponentType;
}

/** Pause after a slide reports one completed loop, before auto-advance. */
export const HERO_GALLERY_HOLD_MS = 800;

/** Cross-fade between stories. */
export const HERO_GALLERY_FADE_MS = 480;

/** How long a manual choice suppresses auto-advance. */
export const HERO_GALLERY_MANUAL_PAUSE_MS = 20000;
