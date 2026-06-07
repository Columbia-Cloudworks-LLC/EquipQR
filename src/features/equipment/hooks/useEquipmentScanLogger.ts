import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCreateScan } from '@/features/equipment/hooks/useEquipment';
import type { Equipment } from '@/features/equipment/types/equipment';

type UseEquipmentScanLoggerParams = {
  equipmentId: string | undefined;
  organizationId: string | undefined;
  scanLocationCollectionEnabled: boolean | undefined;
  isQRScan: boolean;
  equipment: Equipment | null | undefined;
  equipmentName: string | undefined;
  organizationName: string | undefined;
};

export function useEquipmentScanLogger({
  equipmentId,
  organizationId,
  scanLocationCollectionEnabled,
  isQRScan,
  equipment,
  equipmentName,
  organizationName,
}: UseEquipmentScanLoggerParams) {
  const { user } = useAuth();
  const createScanMutation = useCreateScan(organizationId || '');
  const [scanLogged, setScanLogged] = useState(false);

  const { data: userPrivacyPrefs, isPending: privacyPrefsLoading } = useQuery({
    queryKey: ['profile-privacy', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('limit_sensitive_pi')
        .eq('id', user.id)
        .single();
      return data as { limit_sensitive_pi?: boolean } | null;
    },
    enabled: !!user && isQRScan,
    staleTime: 5 * 60 * 1000,
  });

  const logScan = useCallback(async () => {
    if (!equipmentId || !organizationId || scanLogged) {
      return;
    }

    setScanLogged(true);

    try {
      const userLimitedSensitivePi = userPrivacyPrefs?.limit_sensitive_pi === true;

      if (scanLocationCollectionEnabled === false || userLimitedSensitivePi) {
        try {
          await createScanMutation.mutateAsync({
            equipmentId,
            includeProfile: false,
            notes: 'QR code scan',
          });
          toast.success('Equipment scanned successfully!');
        } catch (error) {
          console.error('Failed to log scan:', error);
          toast.error('Failed to log scan');
        }
        return;
      }

      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const location = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;

            try {
              await createScanMutation.mutateAsync({
                equipmentId,
                includeProfile: false,
                location,
                notes: 'QR code scan with location',
              });
              toast.success('Equipment scanned successfully!');
            } catch (error) {
              console.error('Failed to log scan with location:', error);
              toast.error('Failed to log scan');
            }
          },
          async () => {
            try {
              await createScanMutation.mutateAsync({
                equipmentId,
                includeProfile: false,
                notes: 'QR code scan (location denied)',
              });
              toast.success('Equipment scanned successfully!');
            } catch (scanError) {
              console.error('Failed to log scan without location:', scanError);
              toast.error('Failed to log scan');
            }
          },
          {
            enableHighAccuracy: false,
            timeout: 5000,
            maximumAge: 300000,
          },
        );
      } else {
        try {
          await createScanMutation.mutateAsync({
            equipmentId,
            includeProfile: false,
            notes: 'QR code scan (no location support)',
          });
          toast.success('Equipment scanned successfully!');
        } catch (error) {
          console.error('Failed to log scan without location support:', error);
          toast.error('Failed to log scan');
        }
      }
    } catch (error) {
      console.error('Unexpected error during scan logging:', error);
      toast.error('Failed to log scan');
    }
  }, [
    equipmentId,
    organizationId,
    scanLogged,
    createScanMutation,
    userPrivacyPrefs,
    scanLocationCollectionEnabled,
  ]);

  useEffect(() => {
    if (isQRScan && equipment && equipmentId && organizationId && !scanLogged && !privacyPrefsLoading) {
      toast.success('QR Code scanned successfully!', {
        description: `Viewing ${equipmentName} in ${organizationName}`,
        duration: 4000,
      });

      logScan();
    }
  }, [
    equipment,
    equipmentId,
    organizationId,
    equipmentName,
    organizationName,
    isQRScan,
    scanLogged,
    logScan,
    privacyPrefsLoading,
  ]);

  return { privacyPrefsLoading };
}
