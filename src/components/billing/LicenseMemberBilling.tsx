
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Users, AlertCircle, Calendar } from 'lucide-react';
import { useOrganizationMembers } from '@/hooks/useOrganizationMembers';
import { useSlotAvailability } from '@/hooks/useOrganizationSlots';
import { useOrganization } from '@/contexts/OrganizationContext';
import { calculateBilling, hasLicenses } from '@/utils/billing';
import PurchaseLicensesButton from '@/components/billing/PurchaseLicensesButton';
import MemberTable from '@/components/billing/MemberTable';
import { useIsMobile } from '@/hooks/use-mobile';

const LicenseMemberBilling = () => {
  const { currentOrganization } = useOrganization();
  const { data: members = [], isLoading: membersLoading } = useOrganizationMembers(currentOrganization?.id || '');
  const { data: slotAvailability, isLoading: slotsLoading } = useSlotAvailability(currentOrganization?.id || '');
  const _isMobile = useIsMobile();

  const userRole = currentOrganization?.userRole;
  const canManageBilling = ['owner', 'admin'].includes(userRole || '');

  if (membersLoading || slotsLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-32 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!slotAvailability) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Unable to load license information
          </div>
        </CardContent>
      </Card>
    );
  }

  const billing = calculateBilling({ members, slotAvailability, storageGB: 0, fleetMapEnabled: true });
  const hasActiveLicenses = hasLicenses(slotAvailability);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <h3 className="text-xl font-semibold">User Licenses</h3>
                <p className="text-sm text-muted-foreground font-normal">
                  {billing.userSlots.totalPurchased || 0} purchased
                </p>
              </div>
            </div>
            {canManageBilling && (
              <PurchaseLicensesButton 
                variant="default" 
                size={_isMobile ? "sm" : "default"}
                className="bg-green-600 hover:bg-green-700 text-white focus-visible:ring-green-600 sm:ml-2" 
              />
            )}
          </div>
          <div className="text-left sm:text-right">
            <div className="text-sm text-muted-foreground">Monthly Cost</div>
            <div className="text-2xl font-bold">${billing.userSlots.totalCost.toFixed(2)}</div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Description */}
        <div className="text-sm text-muted-foreground leading-relaxed">
          {hasActiveLicenses 
            ? `License-based subscription: You pay $${billing.userSlots.costPerUser}/month per purchased license, regardless of usage. This ensures predictable billing and allows you to manage team capacity effectively.`
            : 'Purchase user licenses to enable team collaboration. Each license costs $10/month and allows one team member to access the platform.'
          }
        </div>

        {/* Admin access warning for non-owners */}
        {!canManageBilling && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <div className="font-medium text-amber-900 dark:text-amber-100 mb-1">
                  Admin access required
                </div>
                <div className="text-amber-800 dark:text-amber-200">
                  Only organization owners and admins can purchase licenses and manage billing.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* License Counts - Mobile Optimized */}
        {hasActiveLicenses && (
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 sm:gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground">{billing.userSlots.totalPurchased || 0}</div>
                <div className="text-sm text-muted-foreground mt-1">Purchased</div>
              </div>
              {(billing.userSlots.exemptedSlots || 0) > 0 && (
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">{billing.userSlots.exemptedSlots || 0}</div>
                  <div className="text-sm text-muted-foreground mt-1">Exempted</div>
                </div>
              )}
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">{billing.userSlots.slotsUsed || 0}</div>
                <div className="text-sm text-muted-foreground mt-1">In Use</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{billing.userSlots.availableSlots || 0}</div>
                <div className="text-sm text-muted-foreground mt-1">Available</div>
              </div>
            </div>
          </div>
        )}

        {/* Next Billing Date - Dark Mode Optimized */}
        {billing.userSlots.nextBillingDate && (
          <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-lg">
            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <div className="text-sm">
              <span className="font-medium text-blue-900 dark:text-blue-100">Next Billing:</span>{' '}
              <span className="text-blue-800 dark:text-blue-200">
                {new Date(billing.userSlots.nextBillingDate).toLocaleDateString()}
              </span>
            </div>
          </div>
        )}
        
        {/* Member Table */}
        <MemberTable members={members} />
        
      </CardContent>
    </Card>
  );
};

export default LicenseMemberBilling;
