
import React from 'react';
import { SessionOrganization } from '@/contexts/SessionContext';
import { SecurityStatus } from '@/components/security/SecurityStatus';
import { SessionStatus } from '@/components/session/SessionStatus';
import { useOrganizationMembers } from '@/hooks/useOrganizationMembers';
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
  const { data: _members = [] } = useOrganizationMembers(organization?.id || '');
  const { data: storageUsage, isLoading: storageLoading } = useOrganizationStorageUsage();

  const handlePurchaseSlots = (quantity: number) => {
    console.log('Purchase slots:', quantity);
    onUpgrade();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
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
