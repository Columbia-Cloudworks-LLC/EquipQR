import { Suspense } from 'react';
import type { HeroSlideDefinition } from './types';

interface HeroSlideFrameProps {
  slide: HeroSlideDefinition;
  reducedMotion: boolean;
  onLoopComplete: () => void;
}

/** Renders the active story, or its still frame when motion is reduced. */
export function HeroSlideFrame({ slide, reducedMotion, onLoopComplete }: HeroSlideFrameProps) {
  if (reducedMotion) {
    const StaticFrame = slide.StaticFrame;
    return <StaticFrame />;
  }

  const Stage = slide.Stage;
  const Fallback = slide.Fallback;
  return (
    <Suspense fallback={<Fallback />}>
      <Stage onLoopComplete={onLoopComplete} />
    </Suspense>
  );
}
