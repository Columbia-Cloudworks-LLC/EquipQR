import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface QuickFormRequestNoticeProps {
  title: string;
  description: string;
  onRetry: () => void;
  isRetrying?: boolean;
}

/** Visible failure for a quick-forms request. Successful empty lists use EmptyState instead. */
export function QuickFormRequestNotice({
  title,
  description,
  onRetry,
  isRetrying = false,
}: QuickFormRequestNoticeProps) {
  return (
    <Alert variant="destructive" role="alert">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{description}</p>
        <Button type="button" variant="outline" size="sm" onClick={onRetry} disabled={isRetrying}>
          {isRetrying ? 'Trying again…' : 'Try again'}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
