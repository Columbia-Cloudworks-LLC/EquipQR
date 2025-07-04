
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, AlertTriangle, TrendingUp } from 'lucide-react';
import { useUnifiedOrganization } from '@/contexts/UnifiedOrganizationContext';
import { useOrganizationMembers } from '@/hooks/useOrganizationMembers';
import { useSlotAvailability } from '@/hooks/useOrganizationSlots';
import { calculateEnhancedBilling, getSlotStatus } from '@/utils/enhancedBillingUtils';
import PurchaseLicensesButton from './PurchaseLicensesButton';

interface SlotBasedBillingProps {
  storageUsedGB: number;
  fleetMapEnabled: boolean;
  onPurchaseSlots: (quantity: number) => void;
  onUpgradeToMultiUser: () => void;
}

const SlotBasedBilling: React.FC<SlotBasedBillingProps> = ({
  storageUsedGB,
  fleetMapEnabled,
  onPurchaseSlots,
  onUpgradeToMultiUser
}) => {
  const { currentOrganization } = useUnifiedOrganization();
  const { data: members = [] } = useOrganizationMembers(currentOrganization?.id || '');
  const { data: slotAvailability, isLoading, refetch } = useSlotAvailability(currentOrganization?.id || '');

  // Provide safe defaults for slot availability
  const safeSlotAvailability = slotAvailability || {
    total_purchased: 0,
    used_slots: 0,
    available_slots: 0,
    current_period_start: new Date().toISOString(),
    current_period_end: new Date().toISOString()
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-48 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  const billing = calculateEnhancedBilling(members, safeSlotAvailability, storageUsedGB, fleetMapEnabled);
  const slotStatus = getSlotStatus(safeSlotAvailability, billing.currentUsage.totalSlotsNeeded);
  const isFreeOrg = members.filter(m => m.status === 'active').length === 1 && safeSlotAvailability.total_purchased === 0;

  const slotUsagePercentage = billing.userSlots.totalPurchased > 0 
    ? (billing.userSlots.slotsUsed / billing.userSlots.totalPurchased) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Slot Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User License Slots
              <Badge variant={slotStatus.variant}>{slotStatus.message}</Badge>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Monthly Value</div>
              <div className="text-lg font-bold">${(billing.userSlots.totalPurchased * 10).toFixed(2)}</div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!isFreeOrg && (
              <>
                {billing.userSlots.totalPurchased > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Slot Usage</span>
                      <span>{billing.userSlots.slotsUsed} / {billing.userSlots.totalPurchased}</span>
                    </div>
                    <Progress value={slotUsagePercentage} className="h-2" />
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-lg font-bold">{billing.userSlots.totalPurchased}</div>
                    <div className="text-sm text-muted-foreground">Licenses Owned</div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-lg font-bold">{billing.userSlots.slotsUsed}</div>
                    <div className="text-sm text-muted-foreground">Licenses Used</div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-lg font-bold">{billing.userSlots.availableSlots}</div>
                    <div className="text-sm text-muted-foreground">Available</div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-lg font-bold">$10</div>
                    <div className="text-sm text-muted-foreground">Per License</div>
                  </div>
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Current Usage Breakdown</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Active users (excluding owner)</span>
                      <span>{billing.currentUsage.activeUsers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pending invitations</span>
                      <span>{billing.currentUsage.pendingInvitations}</span>
                    </div>
                    <div className="border-t pt-1 mt-2 flex justify-between font-medium">
                      <span>Total licenses needed</span>
                      <span>{billing.currentUsage.totalSlotsNeeded}</span>
                    </div>
                  </div>
                </div>

                {/* Low slots warning */}
                {slotStatus.status === 'low' && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      You're running low on available licenses. Purchase more to continue inviting team members.
                    </AlertDescription>
                  </Alert>
                )}

                {/* No slots warning */}
                {slotStatus.status === 'exhausted' && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      All your licenses are used. Purchase more licenses to invite additional team members.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <h4 className="font-medium">Purchase User Licenses</h4>
                  <p className="text-sm text-muted-foreground">
                    Monthly subscription for user licenses at $10 per license. Cancel anytime.
                  </p>
                  <PurchaseLicensesButton className="w-full" />
                </div>
              </>
            )}

            {isFreeOrg && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <div className="font-semibold text-blue-900 mb-1">
                      Upgrade to Multi-User Plan
                    </div>
                    <div className="text-sm text-blue-800 mb-3">
                      Purchase user license subscriptions to enable team collaboration. 
                      Pay monthly per license and invite team members instantly.
                    </div>
                    <PurchaseLicensesButton />
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Estimated Next Billing */}
      {!isFreeOrg && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Estimated Next Billing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-2xl font-bold">${billing.estimatedNextBilling.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">
                Monthly recurring charges for user licenses and add-ons
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>User licenses ({billing.userSlots.totalPurchased})</span>
                  <span>${(billing.userSlots.totalPurchased * 10).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Storage overage</span>
                  <span>${billing.storage.cost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Fleet Map add-on</span>
                  <span>${billing.fleetMap.cost.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Total estimated</span>
                  <span>${billing.estimatedNextBilling.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SlotBasedBilling;
