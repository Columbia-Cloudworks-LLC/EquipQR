
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
  'Copy the URL and paste it into your preferred QR app if that is how you generate printable codes',
  'Or download the PNG/JPG image and print it from your computer or phone',
  'Print this QR code and attach it to the equipment where technicians can scan it',
  "Scans open this equipment's details and are logged automatically",
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
