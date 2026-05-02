import { useState, type ImgHTMLAttributes } from "react";
import { ImageIcon, Smartphone, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SupportScreenshot as SupportScreenshotData } from "./content/types";

interface SupportScreenshotProps {
  screenshot: SupportScreenshotData;
  stepNumber: number;
  className?: string;
}

const viewportIcon: Record<NonNullable<SupportScreenshotData["viewport"]>, typeof Smartphone> = {
  mobile: Smartphone,
  desktop: Monitor,
};

const SupportScreenshot: React.FC<SupportScreenshotProps> = ({
  screenshot,
  stepNumber,
  className,
}) => {
  const [hasError, setHasError] = useState(false);
  const ViewportIcon =
    screenshot.viewport !== undefined ? viewportIcon[screenshot.viewport] : null;

  const figureClass = cn(
    "rounded-lg border bg-muted/20 overflow-hidden",
    className,
  );

  if (hasError) {
    return (
      <figure className={figureClass}>
        <div className="flex min-h-32 items-center justify-center gap-3 bg-muted/40 p-4 text-sm text-muted-foreground">
          <ImageIcon className="h-5 w-5" aria-hidden="true" />
          <div>
            <p className="font-medium">Screenshot coming soon</p>
            <p className="text-xs">{screenshot.alt}</p>
            <p className="text-xs font-mono text-muted-foreground/70 mt-1">
              {screenshot.src}
            </p>
          </div>
        </div>
        {screenshot.caption ? (
          <figcaption className="border-t bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Figure {stepNumber}. {screenshot.caption}
          </figcaption>
        ) : null}
      </figure>
    );
  }

  const imgProps: ImgHTMLAttributes<HTMLImageElement> = {
    src: screenshot.src,
    loading: "lazy",
    decoding: "async",
    onError: () => setHasError(true),
    className: cn(
      "block h-auto max-h-96 w-full object-contain",
      screenshot.viewport === "mobile" ? "bg-muted/10" : "bg-background",
    ),
  };

  return (
    <figure className={figureClass}>
      <img {...imgProps} alt={screenshot.alt} />
      <figcaption className="flex items-center gap-2 border-t bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        {ViewportIcon ? <ViewportIcon className="h-3 w-3" aria-hidden="true" /> : null}
        <span>
          Figure {stepNumber}. {screenshot.caption ?? screenshot.alt}
        </span>
      </figcaption>
    </figure>
  );
};

export default SupportScreenshot;
