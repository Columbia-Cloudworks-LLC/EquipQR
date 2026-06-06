import React from 'react';
import { Link } from 'react-router-dom';
import { WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

type BulkEditOfflinePanelProps = {
  message: string;
  backHref: string;
  backLabel: string;
};

export const BulkEditOfflinePanel: React.FC<BulkEditOfflinePanelProps> = ({
  message,
  backHref,
  backLabel,
}) => (
  <div className="flex flex-col items-center justify-center gap-3 rounded-md border bg-card py-16 text-center">
    <WifiOff className="h-10 w-10 text-muted-foreground" aria-hidden />
    <p className="max-w-md text-sm text-muted-foreground">{message}</p>
    <Button asChild variant="outline">
      <Link to={backHref}>{backLabel}</Link>
    </Button>
  </div>
);
