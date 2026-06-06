
import React from 'react';
import AssetQRCodeDisplay from '@/components/common/AssetQRCodeDisplay';
import { inventoryQRPath, qrFullUrl } from '@/utils/qr';

interface InventoryQRCodeDisplayProps {
  open: boolean;
  onClose: () => void;
  itemId: string;
  itemName?: string;
}

const INVENTORY_QR_INSTRUCTIONS = [
  'Print this QR code and attach it to the inventory item or storage location',
  'Users can scan it with any QR code scanner',
  "They'll be taken directly to this inventory item's details",
  'Scans can be used to quickly access item information and transaction history',
];

const InventoryQRCodeDisplay: React.FC<InventoryQRCodeDisplayProps> = ({
  open,
  onClose,
  itemId,
  itemName,
}) => {
  const qrCodeUrl = qrFullUrl(inventoryQRPath(itemId));

  return (
    <AssetQRCodeDisplay
      open={open}
      onClose={onClose}
      entityId={itemId}
      entityName={itemName}
      title="Inventory Item QR Code"
      resourceLabel="inventory item"
      qrCodeUrl={qrCodeUrl}
      qrImageAlt="Inventory Item QR Code"
      defaultFilenameStem={`inventory-${itemId}`}
      instructionBullets={INVENTORY_QR_INSTRUCTIONS}
    />
  );
};

export default InventoryQRCodeDisplay;
