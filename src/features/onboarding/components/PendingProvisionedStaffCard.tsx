import { UserX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  usePendingProvisionedStaff,
  useRevokePendingProvisionedStaff,
} from '@/features/onboarding/hooks/usePendingProvisionedStaff';

interface PendingProvisionedStaffCardProps {
  organizationId: string;
}

/**
 * People EquipQR set up for this organization who have not signed in yet
 * (Done-For-You onboarding, issue #1648). Owners and admins can remove anyone
 * who should no longer join automatically.
 */
export function PendingProvisionedStaffCard({ organizationId }: PendingProvisionedStaffCardProps) {
  const { data: pending = [] } = usePendingProvisionedStaff(organizationId);
  const revoke = useRevokePendingProvisionedStaff(organizationId);

  if (pending.length === 0) {
    return null;
  }

  return (
    <Card data-testid="pending-provisioned-staff">
      <CardHeader>
        <CardTitle className="text-base">Waiting to sign in</CardTitle>
        <CardDescription>
          These people join this organization automatically the first time they sign in with this
          email. Remove anyone who shouldn&apos;t.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {pending.map((person) => (
          <div
            key={person.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{person.email}</div>
              {person.last_claim_error && (
                <div className="text-xs text-destructive">Last sign-in couldn&apos;t join: {person.last_claim_error}</div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="capitalize">
                {person.role}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => revoke.mutate(person.id)}
                disabled={revoke.isPending}
                aria-label={`Remove ${person.email}`}
              >
                <UserX className="mr-1 h-4 w-4" aria-hidden />
                Remove
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
