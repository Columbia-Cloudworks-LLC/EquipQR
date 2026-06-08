import { Navigate, useLocation, useParams } from 'react-router-dom';

export const RedirectToEquipment = () => {
  const { equipmentId } = useParams();
  return <Navigate to={`/dashboard/equipment/${equipmentId}`} replace />;
};

export const RedirectToWorkOrder = () => {
  const { workOrderId } = useParams();
  return <Navigate to={`/dashboard/work-orders/${workOrderId}`} replace />;
};

/** Legacy `/landing` URLs normalize to canonical `/` (hash and query preserved). */
export const LandingCanonicalRedirect = () => {
  const { hash, search } = useLocation();
  return <Navigate to={{ pathname: '/', search, hash }} replace />;
};
