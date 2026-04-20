import React from 'react';
import { Link } from 'react-router-dom';
import { Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useQuickBooksConnection } from '@/hooks/useQuickBooksConnection';
import { isQuickBooksEnabled } from '@/lib/flags';

interface QuickBooksStatusIndicatorProps {
  organizationId: string;
}

const INTEGRATIONS_HREF = '/dashboard/organization#integrations';

/**
 * Compact QuickBooks integration health indicator rendered in the global TopBar.
 *
 * Visibility:
 * - Returns `null` when the QuickBooks feature flag is disabled.
 * - Returns `null` while loading, on error, or when the org has no QuickBooks
 *   connection yet (no record in `quickbooks_credentials` for this org).
 *
 * Color:
 * - Green (`bg-success`) — connected and access token valid.
 * - Red (`bg-destructive`) — connected but access token has expired (the user
 *   must re-authorize on the integrations page).
 *
 * Click navigates to `/dashboard/organization#integrations` so the user can
 * inspect or repair the connection.
 */
const QuickBooksStatusIndicator: React.FC<QuickBooksStatusIndicatorProps> = ({
  organizationId,
}) => {
  const featureEnabled = isQuickBooksEnabled();
  const { data, isLoading, isError } = useQuickBooksConnection(
    organizationId,
    featureEnabled
  );

  if (!featureEnabled) return null;
  if (isLoading || isError) return null;
  if (!data?.isConnected) return null;

  const isHealthy = data.isAccessTokenValid === true;
  const tooltipText = isHealthy
    ? 'QuickBooks: Connected'
    : 'QuickBooks: Token expired \u2014 re-authorize';
  const ariaLabel = isHealthy
    ? 'QuickBooks integration connected'
    : 'QuickBooks integration token expired';

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-8 px-2 gap-1.5 inline-flex items-center text-muted-foreground hover:text-foreground"
            aria-label={ariaLabel}
          >
            <Link to={INTEGRATIONS_HREF}>
              <span className="relative inline-flex items-center justify-center">
                <Receipt className="h-4 w-4" aria-hidden="true" />
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-background',
                    isHealthy ? 'bg-success' : 'bg-destructive'
                  )}
                />
              </span>
              <span className="hidden sm:inline text-xs font-medium">
                QuickBooks
              </span>
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{tooltipText}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default QuickBooksStatusIndicator;
