
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, AlertCircle } from 'lucide-react';
import { useOrganizationMembers } from '@/hooks/useOrganizationMembers';
import { useOrganization } from '@/contexts/OrganizationContext';
import { calculateBilling, isFreeOrganization } from '@/utils/billing';
import PurchaseLicensesButton from '@/components/billing/PurchaseLicensesButton';
import MemberTable from '@/components/billing/MemberTable';

const SimplifiedMemberBilling = () => {
  const { currentOrganization } = useOrganization();
  const { data: members = [], isLoading } = useOrganizationMembers(currentOrganization?.id || '');

  const userRole = currentOrganization?.userRole;
  const canManageBilling = ['owner', 'admin'].includes(userRole || '');

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-32 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  const billing = calculateBilling({ members, storageGB: 0, fleetMapEnabled: true });
  const isFree = isFreeOrganization(members);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-lg sm:text-xl">
              User Licenses ({billing.userSlots.totalUsers} total)
            </span>
            {isFree && <Badge variant="secondary">Free Plan</Badge>}
          </div>
          <div className="text-left sm:text-right">
            <div className="text-sm text-muted-foreground">Monthly Cost</div>
            <div className="text-lg font-bold">${billing.userSlots.totalCost.toFixed(2)}</div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {isFree 
              ? 'Your single-user organization is free forever. Purchase user licenses to unlock collaboration features at $10/month per additional user.'
              : 'Simple pay-as-you-go pricing: Your first user is always free, then $10/month per additional active user. No complicated billing or limits.'
            }
          </div>
          
          <MemberTable members={members} />
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {isFree 
                ? 'Free single-user plan'
                : `${billing.userSlots.billableUsers} billable users × $${billing.userSlots.costPerUser}/month (first user free)`
              }
            </div>
            <div className="text-lg font-bold">
              Monthly Total: ${billing.userSlots.totalCost.toFixed(2)}
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            {canManageBilling ? (
              <PurchaseLicensesButton variant="outline" className="w-full sm:w-auto" />
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <strong>Admin access required:</strong> Only organization owners and admins can purchase licenses and manage billing.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SimplifiedMemberBilling;
