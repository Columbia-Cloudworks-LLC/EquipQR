import { useContext } from 'react';
import { MFAContext, MFAContextType } from '@/contexts/MFAContext';

/**
 * Hook to access MFA context for enrollment, verification, and status checks.
 * Must be used within an MFAProvider.
 */
export const useMFA = (): MFAContextType => {
  const context = useContext(MFAContext);
  if (!context) {
    throw new Error('useMFA must be used within an MFAProvider');
  }
  return context;
};
