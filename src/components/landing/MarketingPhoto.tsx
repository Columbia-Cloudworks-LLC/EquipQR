import { landingImage } from '@/lib/landingImage';

const photos = {
  equipment: {
    small: 'stock/equipment-yard-640.webp',
    large: 'stock/equipment-yard-1200.webp',
    alt: 'Tracked excavators and loaders parked together on a muddy equipment yard.',
    credit: 'Jason Jarrach / Unsplash',
    source: 'https://unsplash.com/photos/CaZHJbYdEf0',
  },
  workshop: {
    small: 'stock/workshop-tools-640.webp',
    large: 'stock/workshop-tools-1200.webp',
    alt: 'Sockets, a ratchet, safety goggles, and an angle grinder on a workshop bench.',
    credit: 'Anastasia Shuraeva / Pexels',
    source: 'https://www.pexels.com/photo/car-mechanic-tools-on-a-metal-surface-8470683/',
  },
} as const;

/** Real stock photography, separate from customer proof and product screenshots. */
export function MarketingPhoto({
  photo,
  priority = false,
}: {
  photo: keyof typeof photos;
  priority?: boolean;
}) {
  const image = photos[photo];

  return (
    <figure className="min-w-0">
      <img
        src={landingImage(image.large)}
        srcSet={`${landingImage(image.small)} 640w, ${landingImage(image.large)} 1200w`}
        sizes="(min-width: 1400px) 660px, (min-width: 1024px) calc((100vw - 80px) / 2), calc(100vw - 32px)"
        width={1200}
        height={900}
        alt={image.alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding="async"
        className="aspect-4/3 w-full rounded-2xl border border-border object-cover"
      />
      <figcaption className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Stock photography ·{' '}
        <a
          href={image.source}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          {image.credit}
        </a>
      </figcaption>
    </figure>
  );
}
