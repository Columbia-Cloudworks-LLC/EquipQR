import { LifeBuoy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  useRevokeSupportAccess,
  useSupportAccessStatus,
} from '@/features/organization/hooks/useSupportAccess';

/** Shown to every member while EquipQR Support has access; owners can revoke. */
export function SupportAccessBanner() {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id;
  const { data: grant } = useSupportAccessStatus(organizationId);
  const revoke = useRevokeSupportAccess(organizationId);
  const { formatDateTime } = useFormatTimestamp();

  if (!grant) return null;

  const isOwner = currentOrganization?.userRole === 'owner';

  return (
    <div
      role="status"
      data-testid="support-access-banner"
      className="flex flex-wrap items-center gap-2 border-b bg-amber-50 px-4 py-2 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <LifeBuoy className="h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">
        EquipQR Support can access this organization until {formatDateTime(grant.expires_at)}.
      </span>
      {isOwner && (
        <Button
          size="sm"
          variant="outline"
          disabled={revoke.isPending}
          onClick={() =>
            revoke.mutate(undefined, {
              onSuccess: () => toast.success('Support access revoked'),
              onError: () => toast.error('Could not revoke support access'),
            })
          }
        >
          {revoke.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
          Revoke
        </Button>
      )}
    </div>
  );
}
