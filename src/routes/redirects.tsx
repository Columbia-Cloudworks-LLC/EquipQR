import { Navigate, useLocation, useParams } from 'react-router-dom';

export const RedirectToEquipment = () => {
  const { equipmentId } = useParams();
  const { search } = useLocation();
  return <Navigate to={{ pathname: `/dashboard/equipment/${equipmentId}`, search }} replace />;
};

export const RedirectToWorkOrder = () => {
  const { workOrderId } = useParams();
  const { search } = useLocation();
  return <Navigate to={{ pathname: `/dashboard/work-orders/${workOrderId}`, search }} replace />;
};

/** Legacy `/landing` URLs normalize to canonical `/` (hash and query preserved). */
export const LandingCanonicalRedirect = () => {
  const { hash, search } = useLocation();
  return <Navigate to={{ pathname: '/', search, hash }} replace />;
};
