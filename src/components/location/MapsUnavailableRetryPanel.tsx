import { MapPin, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

type MapsUnavailableRetryPanelProps = {
  mapHeight: string;
  onRetry: () => void;
};

export function MapsUnavailableRetryPanel({ mapHeight, onRetry }: MapsUnavailableRetryPanelProps) {
  return (
    <div
      className="rounded-lg border border-dashed border-destructive/40 bg-destructive/5 flex flex-col items-center justify-center gap-2 px-4 text-center"
      style={{ height: mapHeight }}
    >
      <MapPin className="h-6 w-6 text-destructive/70" />
      <p className="text-xs text-muted-foreground">Map unavailable</p>
      <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={onRetry}>
        <RefreshCw className="h-3 w-3" />
        Retry
      </Button>
    </div>
  );
}
