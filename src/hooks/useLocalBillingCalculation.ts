
import { useMemo } from 'react';

interface UseLocalBillingCalculationProps {
  memberCount?: number;
  storageUsedGB?: number;
}

export const useLocalBillingCalculation = ({
  memberCount = 0,
  storageUsedGB = 0
}: UseLocalBillingCalculationProps) => {
  return useMemo(() => {
    // Base costs
    const userLicenseCost = Math.max(0, memberCount - 1) * 10; // First user free
    const storageOverageCost = Math.max(0, storageUsedGB - 1) * 0.10; // First GB free
    const fleetMapCost = 0; // Fleet map is now free
    
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
          enabled: true, // Fleet map is always available
          unitPrice: 0,
          total: 0
        }
      }
    };
  }, [memberCount, storageUsedGB]);
};
