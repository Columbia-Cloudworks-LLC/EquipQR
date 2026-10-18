import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { QuickBooksMarkIcon } from '@/components/icons/QuickBooksMarkIcon';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/hooks/useAuth';
import { useQuickBooksAccess } from '@/hooks/useQuickBooksAccess';
import {
  generateQuickBooksAuthUrl,
  getConnectionStatus,
  isQuickBooksConfigured,
} from '@/services/quickbooks';
import { useProvisionedYardClaim } from '@/features/onboarding/hooks/useProvisionedYardClaim';

export const PROVISIONED_YARD_QBO_PROMPT_STORAGE_PREFIX = 'equipqr:dfy-qbo-prompt-dismissed:';

function isDismissed(organizationId: string): boolean {
  try {
    return Boolean(localStorage.getItem(`${PROVISIONED_YARD_QBO_PROMPT_STORAGE_PREFIX}${organizationId}`));
  } catch {
    return false;
  }
}

function markDismissed(organizationId: string): void {
  try {
    localStorage.setItem(
      `${PROVISIONED_YARD_QBO_PROMPT_STORAGE_PREFIX}${organizationId}`,
      new Date().toISOString(),
    );
  } catch {
    // best-effort; the prompt simply hides for this session
  }
}

/**
 * Non-blocking QuickBooks Online prompt for the owner who claimed a
 * Done-For-You pre-provisioned yard that is not yet connected (issue #1648).
 */
export function ProvisionedYardQuickBooksPrompt() {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const organizationId = currentOrganization?.id;
  const [dismissedOrgId, setDismissedOrgId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const isConfigured = isQuickBooksConfigured();
  const dismissed =
    !organizationId || dismissedOrgId === organizationId || isDismissed(organizationId);
  const isOwner = currentOrganization?.userRole === 'owner';

  const { data: claim } = useProvisionedYardClaim(
    isConfigured && isOwner && !dismissed ? organizationId : undefined,
    user?.id,
  );
  const claimedAsOwner = claim?.role === 'owner';

  const { data: canManage = false } = useQuickBooksAccess(claimedAsOwner ? organizationId : undefined);

  const { data: connectionStatus } = useQuery({
    queryKey: ['quickbooks', 'connection', organizationId],
    queryFn: () => getConnectionStatus(organizationId ?? ''),
    enabled: Boolean(organizationId) && claimedAsOwner && canManage,
    staleTime: 60 * 1000,
  });

  if (
    !organizationId ||
    dismissed ||
    !claimedAsOwner ||
    !canManage ||
    !connectionStatus ||
    connectionStatus.isConnected
  ) {
    return null;
  }

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      window.location.href = await generateQuickBooksAuthUrl({
        organizationId,
        redirectUrl: window.location.pathname,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start QuickBooks connection');
      setIsConnecting(false);
    }
  };

  const handleDismiss = () => {
    markDismissed(organizationId);
    setDismissedOrgId(organizationId);
  };

  return (
    <Card data-testid="provisioned-yard-qbo-prompt">
      <CardHeader className="flex flex-row items-start gap-3 space-y-0">
        <span className="mt-0.5 shrink-0" aria-hidden>
          <QuickBooksMarkIcon />
        </span>
        <div className="space-y-1.5">
          <CardTitle className="text-base">Your yard is ready. Connect QuickBooks next.</CardTitle>
          <CardDescription>
            Link QuickBooks Online to {currentOrganization.name} in about 30 seconds so you can send
            finished work orders as invoices. You can do this later from Organization settings.
          </CardDescription>
        </div>
      </CardHeader>
      <CardFooter className="flex flex-wrap gap-2">
        <Button onClick={handleConnect} disabled={isConnecting}>
          {isConnecting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Link2 className="mr-2 h-4 w-4" aria-hidden />
          )}
          Connect QuickBooks
        </Button>
        <Button variant="ghost" onClick={handleDismiss}>
          Not now
        </Button>
      </CardFooter>
    </Card>
  );
}
