import { useParams } from 'react-router-dom';
import { QRRedirectHandler } from '@/components/qr/QRRedirectHandler';

const WorkOrderQRRedirect = () => {
  const { workOrderId } = useParams<{ workOrderId: string }>();

  return <QRRedirectHandler workOrderId={workOrderId} />;
};

export default WorkOrderQRRedirect;
