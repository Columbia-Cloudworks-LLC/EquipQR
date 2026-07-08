import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';
import {
  MAPS_REFERRER_RUNBOOK_URL,
  type MapsAuthFailure,
} from '@/features/fleet-map/utils/mapsAuthFailure';

/**
 * Inline diagnostic rendered when Google Maps rejects the browser API key for
 * the current URL (`RefererNotAllowedMapError`). Surfaces the exact wildcard
 * referrer entry the operator must add to the API key's HTTP-referrer
 * allowlist (plus the current page URL for cross-reference with Google's own
 * console message) and links to the runbook. A simple page reload is the only
 * reliable retry — the bad key has already been baked into the cached Maps JS
 * bundle. See issue #617 follow-up.
 */
export const MapsAuthFailureCard: React.FC<{ failure: MapsAuthFailure }> = ({ failure }) => (
  <div
    className="flex items-center justify-center min-h-[400px] p-4"
    role="alert"
    aria-live="assertive"
    data-testid="maps-auth-failure-card"
  >
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
        </div>
        <CardTitle className="text-xl">Map could not load</CardTitle>
        <CardDescription>
          The Google Maps API key returned by the server is not authorized for this URL.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md space-y-2">
          <div>
            <p className="text-sm text-destructive font-medium">Referrer allowlist entry to add:</p>
            <p
              className="text-sm font-mono break-all text-muted-foreground mt-1"
              data-testid="maps-auth-failure-allowlist-entry"
            >
              {failure.allowlistEntry}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Current page URL (for correlation):</p>
            <p
              className="text-xs font-mono break-all text-muted-foreground mt-1"
              data-testid="maps-auth-failure-current-url"
            >
              {failure.currentUrl}
            </p>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          <p className="font-medium mb-2">How to fix:</p>
          <ol className="space-y-1 list-decimal list-inside">
            <li>Open Google Cloud Console -&gt; APIs &amp; Services -&gt; Credentials.</li>
            <li>
              Edit the API key currently set as <code className="font-mono text-xs">GOOGLE_MAPS_BROWSER_KEY</code>
              {' '}on the relevant Supabase project.
            </li>
            <li>
              Under Application restrictions -&gt; HTTP referrers, add the
              {' '}<strong>allowlist entry</strong> above (the
              {' '}<code className="font-mono text-xs">/*</code> wildcard pattern, not the route-specific URL)
              and Save.
            </li>
            <li>Wait ~1 minute for Google to propagate, then click Try Again.</li>
          </ol>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={() => window.location.reload()}
            className="flex-1"
            variant="outline"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button
            onClick={() => window.open(MAPS_REFERRER_RUNBOOK_URL, '_blank', 'noopener,noreferrer')}
            className="flex-1"
            variant="ghost"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            View Runbook
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);
