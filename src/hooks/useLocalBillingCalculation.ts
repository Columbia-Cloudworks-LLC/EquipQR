
import { useMemo } from 'react';
import { FleetMapSubscription } from './useFleetMapSubscription';

interface UseLocalBillingCalculationProps {
  memberCount?: number;
  storageUsedGB?: number;
  fleetMapSubscription?: FleetMapSubscription;
}

export const useLocalBillingCalculation = ({
  memberCount = 0,
  storageUsedGB = 0,
  fleetMapSubscription
}: UseLocalBillingCalculationProps) => {
  return useMemo(() => {
    // Base costs
    const userLicenseCost = Math.max(0, memberCount - 1) * 10; // First user free
    const storageOverageCost = Math.max(0, storageUsedGB - 1) * 0.10; // First GB free
    const fleetMapCost = fleetMapSubscription?.active ? 10 : 0;
    
    const totalMonthlyCost = userLicenseCost + storageOverageCost + fleetMapCost;
    
    return {
      userLicenseCost,
      storageOverageCost,
      fleetMapCost,
      totalMonthlyCost,
      breakdown: {
        userLicenses: {
          count: Math.max(0, memberCount - 1),
          unitPrice: 10,
          total: userLicenseCost
        },
        storage: {
          overageGB: Math.max(0, storageUsedGB - 1),
          unitPrice: 0.10,
          total: storageOverageCost
        },
        fleetMap: {
          enabled: fleetMapSubscription?.active || false,
          unitPrice: 10,
          total: fleetMapCost
        }
      }
    };
  }, [memberCount, storageUsedGB, fleetMapSubscription]);
};
