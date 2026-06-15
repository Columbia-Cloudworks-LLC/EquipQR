import React from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { QrCode } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import AssetQRCodePanel from '@/components/common/AssetQRCodePanel';
import { equipmentQRPath, qrFullUrl } from '@/utils/qr';

const ONBOARDING_QR_INSTRUCTIONS = [
  'Copy the URL and paste it into your preferred QR generator app if that is how you print labels',
  'Or download the QR image (PNG/JPG) and print it from your computer or phone',
  'Affix the printed code to the equipment where technicians can scan it in the field',
  'Without a physical QR label on the machine, EquipQR is just digital paperwork you already had',
];

interface QRCodeOnboardingStepProps {
  equipmentId: string;
  equipmentName: string;
  onFinish: () => void;
  isFinishing?: boolean;
}

export const QRCodeOnboardingStep: React.FC<QRCodeOnboardingStepProps> = ({
  equipmentId,
  equipmentName,
  onFinish,
  isFinishing = false,
}) => {
  const { currentOrganization } = useOrganization();
  const qrCodeUrl = qrFullUrl(equipmentQRPath(equipmentId, currentOrganization?.id));

  return (
    <div className="space-y-6" data-testid="onboarding-step-qr-code">
      <Alert variant="default" className="border-primary/30 bg-primary/5">
        <QrCode className="h-4 w-4" />
        <AlertTitle>Affix the QR code to your equipment</AlertTitle>
        <AlertDescription>
          This is the most important step. Technicians scan this code to open the equipment record,
          log work, and create work orders in the field. Choose whichever printing method works for
          your shop — URL paste or image download.
        </AlertDescription>
      </Alert>

      <AssetQRCodePanel
        entityId={equipmentId}
        entityName={equipmentName}
        qrCodeUrl={qrCodeUrl}
        qrImageAlt={`QR code for ${equipmentName}`}
        defaultFilenameStem={equipmentName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}
        instructionBullets={ONBOARDING_QR_INSTRUCTIONS}
        formatSelectId="onboarding-qr-format"
      />

      <div className="flex justify-end">
        <Button onClick={onFinish} disabled={isFinishing} data-testid="onboarding-finish-button">
          {isFinishing ? 'Finishing...' : 'Finish setup'}
        </Button>
      </div>
    </div>
  );
};
