import React from 'react';
import { Navigate, useParams } from 'react-router-dom';

/**
 * Backward compatibility for legacy equipment QR codes.
 *
 * Legacy format: /qr/:equipmentId
 * New format:    /qr/equipment/:equipmentId
 */
const LegacyEquipmentQRRedirect = () => {
  const { equipmentId } = useParams<{ equipmentId: string }>();
  return <Navigate to={`/qr/equipment/${equipmentId}`} replace />;
};

export default LegacyEquipmentQRRedirect;

