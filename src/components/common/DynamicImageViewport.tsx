import React, { useCallback, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Download } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  calculatePanPosition,
  copyImageToClipboard,
  downloadImageFile,
  imageSupportsPanning,
  type PanPosition,
} from '@/components/common/dynamicImageViewportUtils';

export interface DynamicImageViewportProps {
  src: string;
  alt: string;
  fileName?: string;
  className?: string;
  imageClassName?: string;
  /** object-fit strategy — cover enables hover pan when aspect ratios differ */
  fit?: 'cover' | 'contain';
  showControls?: boolean;
  onClick?: () => void;
}

const DEFAULT_PAN: PanPosition = { x: 50, y: 50 };

const DynamicImageViewport: React.FC<DynamicImageViewportProps> = ({
  src,
  alt,
  fileName,
  className,
  imageClassName,
  fit = 'cover',
  showControls = true,
  onClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState<PanPosition>(DEFAULT_PAN);
  const [canPan, setCanPan] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const handleImageLoad = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      const img = event.currentTarget;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      setCanPan(
        fit === 'cover' &&
          imageSupportsPanning(img.naturalWidth, img.naturalHeight, rect.width, rect.height),
      );
    },
    [fit],
  );

  const updatePanFromPointer = useCallback((clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    setPan(
      calculatePanPosition(
        clientX - rect.left,
        clientY - rect.top,
        rect.width,
        rect.height,
      ),
    );
  }, []);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!canPan) return;
      updatePanFromPointer(event.clientX, event.clientY);
    },
    [canPan, updatePanFromPointer],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!canPan) return;
      setIsPanning(true);
      event.currentTarget.setPointerCapture(event.pointerId);
      updatePanFromPointer(event.clientX, event.clientY);
    },
    [canPan, updatePanFromPointer],
  );

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (isPanning) {
      setIsPanning(false);
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, [isPanning]);

  const handleDownload = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();
      downloadImageFile(src, fileName || alt || 'image');
      toast.success('Download started');
    },
    [src, fileName, alt],
  );

  const handleCopy = useCallback(
    async (event: React.MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();
      setIsCopying(true);
      try {
        await copyImageToClipboard(src, fileName || alt || 'image.png');
        toast.success('Image copied to clipboard');
      } catch (error) {
        console.error('Failed to copy image:', error);
        toast.error('Could not copy image to clipboard');
      } finally {
        setIsCopying(false);
      }
    },
    [src, fileName, alt],
  );

  const objectPosition = canPan ? `${pan.x}% ${pan.y}%` : 'center center';

  return (
    <div
      ref={containerRef}
      className={cn(
        'group/viewport relative overflow-hidden bg-muted',
        canPan && 'cursor-crosshair touch-none',
        className,
      )}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => setIsPanning(false)}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <img
        src={src}
        alt={alt}
        className={cn(
          'h-full w-full select-none',
          fit === 'cover' ? 'object-cover' : 'object-contain',
          imageClassName,
        )}
        style={{ objectPosition }}
        onLoad={handleImageLoad}
        draggable={false}
        loading="lazy"
        decoding="async"
      />

      {showControls ? (
        <div
          className="pointer-events-none absolute right-1.5 top-1.5 z-[2] flex gap-1 opacity-0 transition-opacity group-hover/viewport:opacity-100 group-focus-within/viewport:opacity-100"
          aria-hidden={false}
        >
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="pointer-events-auto h-8 w-8 bg-background/70 shadow-sm backdrop-blur-sm"
            onClick={handleDownload}
            aria-label={`Download ${alt}`}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="pointer-events-auto h-8 w-8 bg-background/70 shadow-sm backdrop-blur-sm"
            onClick={handleCopy}
            disabled={isCopying}
            aria-label={`Copy ${alt} to clipboard`}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
};

export default DynamicImageViewport;
