import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { logger } from '@/utils/logger';

interface FleetMapErrorBoundaryPresentationalProps {
  /** Pre-known error message to render as a card. */
  error: string;
  /** Handler for the "Try Again" button. */
  onRetry: () => void;
  /** Disable retry while a refetch is in flight. */
  isRetrying?: boolean;
  children?: undefined;
  onReset?: undefined;
}

interface FleetMapErrorBoundaryBoundaryProps {
  /** Children that will be guarded by the React error boundary. */
  children: ReactNode;
  /** Optional reset hook fired on retry, after the boundary state is cleared. */
  onReset?: () => void;
  error?: undefined;
  onRetry?: undefined;
  isRetrying?: undefined;
}

type FleetMapErrorBoundaryProps =
  | FleetMapErrorBoundaryPresentationalProps
  | FleetMapErrorBoundaryBoundaryProps;

interface State {
  hasError: boolean;
  caughtError?: Error;
}

/**
 * Class-based React error boundary for the Fleet Map feature.
 *
 * Two modes:
 *   1. **Boundary mode** — pass `children`. Any thrown error inside the
 *      subtree (e.g. `marker.js` `TypeError` when Google Maps half-initializes
 *      after a `RefererNotAllowedMapError`) is caught and a diagnostic card is
 *      rendered in place of the global "Something went wrong" page.
 *   2. **Presentational mode** — pass `error`, `onRetry`, `isRetrying`. The
 *      card is rendered immediately. Used by the FleetMap page's pre-mount
 *      error states (failed fleet data fetch, missing maps key, etc.) and by
 *      MapView's `gm_authFailure` handler.
 *
 * See issue #617.
 */
export class FleetMapErrorBoundary extends Component<FleetMapErrorBoundaryProps, State> {
  private fallbackRef = React.createRef<HTMLDivElement>();

  constructor(props: FleetMapErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, caughtError: error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('[FleetMapErrorBoundary] Caught render-time error in Fleet Map subtree', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
    this.fallbackRef.current?.focus();
  }

  handleBoundaryReset = (): void => {
    this.setState({ hasError: false, caughtError: undefined });
    if (this.props.error === undefined && this.props.onReset) {
      this.props.onReset();
    }
  };

  render(): ReactNode {
    if (this.props.error !== undefined) {
      return renderCard({
        ref: this.fallbackRef,
        message: this.props.error,
        onRetry: this.props.onRetry,
        isRetrying: this.props.isRetrying ?? false,
      });
    }

    if (this.state.hasError) {
      const caughtMessage =
        this.state.caughtError?.message?.trim() ||
        'The Fleet Map crashed unexpectedly while rendering.';
      return renderCard({
        ref: this.fallbackRef,
        message: caughtMessage,
        onRetry: this.handleBoundaryReset,
        isRetrying: false,
      });
    }

    return this.props.children;
  }
}

interface CardProps {
  ref: React.Ref<HTMLDivElement>;
  message: string;
  onRetry: () => void;
  isRetrying: boolean;
}

function renderCard({ ref, message, onRetry, isRetrying }: CardProps): ReactNode {
  return (
    <div
      ref={ref}
      className="flex items-center justify-center min-h-[400px]"
      role="alert"
      aria-live="assertive"
      tabIndex={-1}
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-xl">Fleet Map Error</CardTitle>
          <CardDescription>
            There was a problem loading the fleet map
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive font-medium">Error Details:</p>
            <p className="text-sm text-muted-foreground mt-1">{message}</p>
          </div>

          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-2">Common causes:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Missing Google Maps API key configuration</li>
              <li>Google Cloud API key HTTP-referrer allowlist missing this URL</li>
              <li>Edge function deployment issues</li>
              <li>Network connectivity problems</li>
              <li>Subscription or permissions issues</li>
            </ul>
          </div>

          <Button
            onClick={onRetry}
            disabled={isRetrying}
            className="w-full"
            variant="outline"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
