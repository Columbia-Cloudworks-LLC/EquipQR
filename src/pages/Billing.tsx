
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Settings } from 'lucide-react';
import LicenseMemberBilling from '@/components/billing/LicenseMemberBilling';
import ImageStorageQuota from '@/components/billing/ImageStorageQuota';
import BillingHeader from '@/components/billing/BillingHeader';
import RestrictedBillingAccess from '@/components/billing/RestrictedBillingAccess';
import BillingExemptionsCard from '@/components/billing/BillingExemptionsCard';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOrganizationMembers } from '@/hooks/useOrganizationMembers';
import { useSlotAvailability } from '@/hooks/useOrganizationSlots';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from '@/hooks/use-toast';
import { calculateBilling, hasLicenses } from '@/utils/billing';
import { useIsMobile } from '@/hooks/use-mobile';
import { logger } from '@/utils/logger';

const Billing = () => {
  const { currentOrganization } = useOrganization();
  
  const { data: members = [] } = useOrganizationMembers(currentOrganization?.id || '');
  const { data: slotAvailability } = useSlotAvailability(currentOrganization?.id || '');
  const { 
    isSubscribed, 
    openCustomerPortal,
    checkSubscription 
  } = useSubscription();
  
  const isMobile = useIsMobile();
  
  // Mock data for storage - in a real app, this would come from your backend
  const [storageUsedGB] = useState(3.2);
  const [fleetMapEnabled] = useState(false);

  // Get user role for permission checks
  const userRole = currentOrganization?.userRole;
  const canViewBilling = ['owner', 'admin'].includes(userRole || '');
  const canManageBilling = userRole === 'owner'; // Only owners can manage payment methods

  // Calculate billing based on licenses
  const billing = slotAvailability ? calculateBilling({ members, slotAvailability, storageGB: storageUsedGB, fleetMapEnabled }) : null;
  const hasActiveLicenses = slotAvailability ? hasLicenses(slotAvailability) : false;

  // Handle success/cancel URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const cancelled = urlParams.get('cancelled');

    if (success === 'true') {
      toast({
        title: 'Payment Successful!',
        description: 'Your licenses have been purchased. Team members you invite will now have access.',
        variant: 'default',
      });
      
      checkSubscription();
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (cancelled === 'true') {
      toast({
        title: 'Payment Cancelled',
        description: 'Your license purchase was cancelled. No charges were made.',
        variant: 'destructive',
      });
      
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [checkSubscription]);

  const handleManageSubscription = async () => {
    if (!canManageBilling) {
      toast({
        title: 'Permission Denied',
        description: 'Only organization owners can manage subscriptions.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await openCustomerPortal();
      toast({
        title: 'Opening Subscription Management...',
        description: 'Redirecting to Stripe Customer Portal',
      });
    } catch (error) {
      logger.error('Failed to open subscription management', error);
      toast({
        title: 'Error',
        description: 'Failed to open subscription management. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (!currentOrganization) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-orange-800">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">
                Please select an organization to view billing information.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Only organization owners and admins can view billing
  if (!canViewBilling) {
    return <RestrictedBillingAccess currentOrganizationName={currentOrganization.name} />;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <BillingHeader
        organizationName={currentOrganization.name}
        isFree={!hasActiveLicenses}
        isSubscribed={isSubscribed}
        canManageBilling={canManageBilling}
        onManageSubscription={handleManageSubscription}
      />

      {/* License-based Member Billing */}
      <LicenseMemberBilling />

      {/* Billing Exemptions (if any) */}
      <BillingExemptionsCard organizationId={currentOrganization.id} />

      {/* Image Storage Quota */}
      <ImageStorageQuota organizationId={currentOrganization?.id} />

      {/* Fleet Map Add-on */}
      {hasActiveLicenses && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Premium Add-ons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="font-medium">Fleet Map</div>
                <div className="text-sm text-muted-foreground">
                  Visual equipment tracking and location management
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <Badge variant={fleetMapEnabled ? 'default' : 'secondary'}>
                  {fleetMapEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
                {isSubscribed && canManageBilling && (
                  <Button 
                    variant="outline" 
                    onClick={handleManageSubscription}
                    size={isMobile ? "sm" : "default"}
                    className="w-full sm:w-auto"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Manage
                  </Button>
                )}
                {!canManageBilling && (
                  <div className="text-sm text-muted-foreground">
                    Contact owner
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing Summary */}
      {billing && hasActiveLicenses && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Billing Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">User Licenses ({billing.userSlots.totalPurchased || 0})</span>
                <span className="font-medium">${billing.userSlots.totalCost.toFixed(2)}</span>
              </div>
              {billing.storage.cost > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Storage Overage</span>
                  <span className="font-medium">${billing.storage.cost.toFixed(2)}</span>
                </div>
              )}
              {billing.features.fleetMap.enabled && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Fleet Map Add-on</span>
                  <span className="font-medium">${billing.features.fleetMap.cost.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t pt-3">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Monthly Total</span>
                  <span>${billing.totals.monthlyTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Billing;
