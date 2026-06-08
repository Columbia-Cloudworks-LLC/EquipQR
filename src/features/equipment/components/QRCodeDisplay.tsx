
import React from 'react';
import AssetQRCodeDisplay from '@/components/common/AssetQRCodeDisplay';
import { equipmentQRPath, qrFullUrl } from '@/utils/qr';

interface QRCodeDisplayProps {
  open: boolean;
  onClose: () => void;
  equipmentId: string;
  equipmentName?: string;
  /** When provided the generated QR URL includes `?org=<id>` so the scan
   *  landing page can perform a single-org lookup instead of a cross-org scan. */
  organizationId?: string;
}

const EQUIPMENT_QR_INSTRUCTIONS = [
  'Print this QR code and attach it to the equipment',
  'Users can scan it with any QR code scanner',
  "They'll be taken directly to this equipment's details",
  'Scans are automatically logged with location data',
];

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  open,
  onClose,
  equipmentId,
  equipmentName,
  organizationId,
}) => {
  const qrCodeUrl = qrFullUrl(equipmentQRPath(equipmentId, organizationId));

  return (
    <AssetQRCodeDisplay
      open={open}
      onClose={onClose}
      entityId={equipmentId}
      entityName={equipmentName}
      title="Equipment QR Code"
      resourceLabel="equipment"
      qrCodeUrl={qrCodeUrl}
      qrImageAlt="Equipment QR Code"
      defaultFilenameStem={`equipment-${equipmentId}`}
      instructionBullets={EQUIPMENT_QR_INSTRUCTIONS}
      formatSelectId="qr-code-download-format"
      imageLoading="lazy"
    />
  );
};

export default QRCodeDisplay;
