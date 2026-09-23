import {
  EXCAVATOR_BODY,
  EXCAVATOR_TRACKS,
  EXCAVATOR_VIEWBOX,
  EXCAVATOR_WHEELS,
} from './excavatorPaths';

/**
 * Side-view excavator in the hero's purple line treatment.
 * The source fills are redrawn as a light fill plus a stroke so the boom,
 * cab, tracks, and bucket stay recognizable at hero scale.
 */
export function ExcavatorSilhouette() {
  return (
    <svg
      viewBox={EXCAVATOR_VIEWBOX}
      width="100%"
      height="100%"
      data-testid="excavator-silhouette"
      aria-hidden="true"
    >
      <path d={EXCAVATOR_TRACKS} fill="hsl(var(--primary) / 0.7)" fillRule="evenodd" />
      <path
        d={EXCAVATOR_BODY}
        fill="hsl(var(--primary) / 0.8)"
        fillRule="evenodd"
        stroke="hsl(var(--primary))"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {EXCAVATOR_WHEELS.map((d) => (
        <path
          key={d}
          d={d}
          fill="none"
          stroke="hsl(var(--background))"
          strokeWidth={4}
        />
      ))}
    </svg>
  );
}
