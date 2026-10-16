import { useState } from 'react';
import { LifeBuoy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DEFAULT_SUPPORT_ACCESS_HOURS,
  SUPPORT_ACCESS_DURATIONS,
  type SupportAccessHours,
  useGrantSupportAccess,
  useRevokeSupportAccess,
  useSupportAccessStatus,
} from '@/features/organization/hooks/useSupportAccess';

interface SupportAccessCardProps {
  organizationId: string;
}

function toHours(value: string): SupportAccessHours {
  return SUPPORT_ACCESS_DURATIONS.find((d) => String(d.hours) === value)?.hours ?? DEFAULT_SUPPORT_ACCESS_HOURS;
}

/** Owner-only: let EquipQR Support into this organization for a limited time. */
export function SupportAccessCard({ organizationId }: SupportAccessCardProps) {
  const { data: grant } = useSupportAccessStatus(organizationId);
  const grantAccess = useGrantSupportAccess(organizationId);
  const revoke = useRevokeSupportAccess(organizationId);
  const [hours, setHours] = useState<SupportAccessHours>(DEFAULT_SUPPORT_ACCESS_HOURS);
  const { formatDateTime } = useFormatTimestamp();

  const handleGrant = () =>
    grantAccess.mutate(hours, {
      onSuccess: (result) =>
        toast.success(
          `${result.extended ? 'Support access extended' : 'Support access granted'} until ${formatDateTime(result.expiresAt)}`,
        ),
      onError: (error) => toast.error(error.message),
    });

  return (
    <section className="space-y-3 rounded-lg border p-4" data-testid="support-access-card">
      <div className="flex items-start gap-3">
        <LifeBuoy className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        <div className="space-y-1">
          <h3 className="text-sm font-medium">EquipQR Support access</h3>
          <p className="text-sm text-muted-foreground">
            Let EquipQR Support sign in to this organization as an admin to look into a problem.
            They can see and edit your data, but can&apos;t invite people, change members, or touch
            billing and integrations. Access ends automatically.
          </p>
          {grant && (
            <p className="text-sm font-medium">Active until {formatDateTime(grant.expires_at)}</p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="support-access-duration">{grant ? 'Extend for' : 'Duration'}</Label>
          <Select value={String(hours)} onValueChange={(value) => setHours(toHours(value))}>
            <SelectTrigger id="support-access-duration" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORT_ACCESS_DURATIONS.map((d) => (
                <SelectItem key={d.hours} value={String(d.hours)}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleGrant} disabled={grantAccess.isPending}>
          {grantAccess.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
          {grant ? 'Extend access' : 'Grant access'}
        </Button>
        {grant && (
          <Button
            variant="outline"
            disabled={revoke.isPending}
            onClick={() =>
              revoke.mutate(undefined, {
                onSuccess: () => toast.success('Support access revoked'),
                onError: () => toast.error('Could not revoke support access'),
              })
            }
          >
            Revoke
          </Button>
        )}
      </div>
    </section>
  );
}
