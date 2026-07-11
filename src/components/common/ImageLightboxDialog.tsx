import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Copy, Download } from 'lucide-react';
import { toast } from 'sonner';
import {
  applyPinchScale,
  DEFAULT_LIGHTBOX_TRANSFORM,
  getTouchDistance,
  type LightboxTransform,
} from '@/components/common/imageLightboxUtils';
import {
  copyImageToClipboard,
  downloadImageFile,
} from '@/components/common/dynamicImageViewportUtils';

export interface ImageLightboxImage {
  src: string;
  alt: string;
  fileName?: string;
}

interface ImageLightboxDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  image: ImageLightboxImage | null;
}

const ImageLightboxDialog: React.FC<ImageLightboxDialogProps> = ({
  open,
  onOpenChange,
  image,
}) => {
  const [transform, setTransform] = useState<LightboxTransform>(DEFAULT_LIGHTBOX_TRANSFORM);
  const [isCopying, setIsCopying] = useState(false);
  const pinchRef = useRef<{
    startDistance: number;
    startScale: number;
    lastTouch?: { x: number; y: number };
  } | null>(null);

  useEffect(() => {
    if (open) {
      setTransform(DEFAULT_LIGHTBOX_TRANSFORM);
      pinchRef.current = null;
    }
  }, [open, image?.src]);

  const handleDownload = useCallback(async () => {
    if (!image) return;
    try {
      await downloadImageFile(image.src, image.fileName || image.alt || 'image');
      toast.success('Download started');
    } catch (error) {
      console.error('Failed to download image:', error);
      toast.error('Could not download image');
    }
  }, [image]);

  const handleCopy = useCallback(async () => {
    if (!image) return;
    setIsCopying(true);
    try {
      await copyImageToClipboard(image.src, image.fileName || image.alt || 'image.png');
      toast.success('Image copied to clipboard');
    } catch (error) {
      console.error('Failed to copy image:', error);
      toast.error('Could not copy image to clipboard');
    } finally {
      setIsCopying(false);
    }
  }, [image]);

  const handleTouchStart = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (event.touches.length === 2) {
        const distance = getTouchDistance(event.touches[0], event.touches[1]);
        pinchRef.current = {
          startDistance: distance,
          startScale: transform.scale,
        };
        return;
      }

      if (event.touches.length === 1 && transform.scale > 1) {
        const touch = event.touches[0];
        pinchRef.current = {
          startDistance: 0,
          startScale: transform.scale,
          lastTouch: { x: touch.clientX, y: touch.clientY },
        };
      }
    },
    [transform.scale],
  );

  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    const pinch = pinchRef.current;
    if (!pinch) return;

    if (event.touches.length === 2 && pinch.startDistance > 0) {
      event.preventDefault();
      const distance = getTouchDistance(event.touches[0], event.touches[1]);
      const nextScale = applyPinchScale(pinch.startScale, pinch.startDistance, distance);
      setTransform((current) => ({
        ...current,
        scale: nextScale,
        translateX: nextScale <= 1 ? 0 : current.translateX,
        translateY: nextScale <= 1 ? 0 : current.translateY,
      }));
      return;
    }

    if (event.touches.length === 1 && pinch.lastTouch && pinch.startScale > 1) {
      event.preventDefault();
      const touch = event.touches[0];
      const deltaX = touch.clientX - pinch.lastTouch.x;
      const deltaY = touch.clientY - pinch.lastTouch.y;
      pinch.lastTouch = { x: touch.clientX, y: touch.clientY };
      setTransform((current) => ({
        ...current,
        translateX: current.translateX + deltaX,
        translateY: current.translateY + deltaY,
      }));
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    pinchRef.current = null;
    setTransform((current) =>
      current.scale <= 1
        ? DEFAULT_LIGHTBOX_TRANSFORM
        : current,
    );
  }, []);

  if (!image) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="max-w-[min(100vw-2rem,56rem)] gap-3 p-4 sm:p-6">
        <DialogHeader className="space-y-1 pr-8">
          <DialogTitle className="truncate text-base">{image.alt}</DialogTitle>
        </DialogHeader>

        <div
          className="relative flex h-[min(70dvh,32rem)] w-full touch-none items-center justify-center overflow-hidden rounded-lg bg-muted"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <img
            src={image.src}
            alt={image.alt}
            draggable={false}
            className="max-h-full max-w-full select-none object-contain"
            style={{
              transform: `translate(${transform.translateX}px, ${transform.translateY}px) scale(${transform.scale})`,
              transformOrigin: 'center center',
            }}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => void handleDownload()}>
            <Download className="mr-2 h-4 w-4" aria-hidden />
            Download
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void handleCopy()}
            disabled={isCopying}
          >
            <Copy className="mr-2 h-4 w-4" aria-hidden />
            Copy
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageLightboxDialog;
