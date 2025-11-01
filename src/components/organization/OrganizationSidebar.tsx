
import React from 'react';
import { SessionOrganization } from '@/contexts/SessionContext';
import { SecurityStatus } from '@/components/security/SecurityStatus';
import { SessionStatus } from '@/components/session/SessionStatus';
import { useOrganizationStorageUsage } from '@/hooks/useOrganizationStorageUsage';
import SlotBasedBilling from '@/components/billing/SlotBasedBilling';

interface OrganizationSidebarProps {
  organization: SessionOrganization;
  onUpgrade: () => void;
}

const OrganizationSidebar: React.FC<OrganizationSidebarProps> = ({
  organization,
  onUpgrade
}) => {
  const { data: storageUsage, isLoading: storageLoading } = useOrganizationStorageUsage(organization.id);

  const handlePurchaseSlots = () => {
    // Purchase slots functionality
    onUpgrade();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="lg:sticky lg:top-6">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Current organization</p>
          <p className="text-base font-semibold">{organization.name}</p>
        </div>
      </div>
      <div className="lg:sticky lg:top-6">
        <SessionStatus />
      </div>
      <div className="lg:sticky lg:top-6">
        <SecurityStatus />
      </div>
      <div className="lg:sticky lg:top-6">
        <SlotBasedBilling
          storageUsedGB={storageLoading ? 0 : (storageUsage?.totalSizeGB || 0)}
          onPurchaseSlots={handlePurchaseSlots}
          onUpgradeToMultiUser={onUpgrade}
        />
      </div>
    </div>
  );
};

export default OrganizationSidebar;
