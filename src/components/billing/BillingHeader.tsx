
import React from 'react';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface BillingHeaderProps {
  organizationName: string;
  isFree: boolean;
  isSubscribed: boolean;
  canManageBilling: boolean;
  onManageSubscription: () => void;
}

const BillingHeader: React.FC<BillingHeaderProps> = ({
  organizationName,
  isFree,
  isSubscribed,
  canManageBilling,
  onManageSubscription
}) => {
  const isMobile = useIsMobile();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Billing & Usage
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {isMobile ? (
              <>Manage licenses for {organizationName}</>
            ) : (
              <>Manage your organization's licenses and billing for {organizationName}</>
            )}
          </p>
        </div>
        
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="text-sm text-muted-foreground">
            {isFree ? 'No Active Licenses' : 'License Subscription Active'}
          </span>
          {isSubscribed && canManageBilling && (
            <Button 
              variant="outline" 
              onClick={onManageSubscription}
              size={isMobile ? "sm" : "default"}
              className="w-full sm:w-auto"
            >
              <Settings className="mr-2 h-4 w-4" />
              <span className="sm:inline">Manage</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillingHeader;
