
import React from 'react';
import { useParams } from 'react-router-dom';
import { QRRedirectHandler } from '@/components/qr/QRRedirectHandler';

const InventoryQRRedirect = () => {
  const { itemId } = useParams<{ itemId: string }>();

  return <QRRedirectHandler inventoryItemId={itemId} />;
};

export default InventoryQRRedirect;

