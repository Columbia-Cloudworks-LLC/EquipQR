import React, { lazy, Suspense, useEffect, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';
import {
  NEW_WORK_ORDER_EVENT,
  shouldIgnoreNewWorkOrderShortcut,
  type NewWorkOrderRequest,
} from '@/features/work-orders/launcher/newWorkOrderLauncher';

const WorkOrderForm = lazy(() => import('@/features/work-orders/components/WorkOrderForm'));

type LauncherState = { request: NewWorkOrderRequest; nonce: number } | null;

/**
 * Mounted once in the dashboard layout. Opens the New Work Order dialog when
 * something calls `openNewWorkOrder()` or, on desktop, when the user presses
 * `C` outside of a text field.
 */
const GlobalWorkOrderLauncher: React.FC = () => {
  const isMobile = useIsMobile();
  const { workOrders } = useUnifiedPermissions();
  const canCreate = workOrders.getPermissions().canCreate;
  const [state, setState] = useState<LauncherState>(null);

  useEffect(() => {
    if (!canCreate) return;

    const handleRequest = (event: Event) => {
      const detail = (event as CustomEvent<NewWorkOrderRequest>).detail ?? {};
      setState({ request: detail, nonce: Date.now() });
    };

    window.addEventListener(NEW_WORK_ORDER_EVENT, handleRequest);
    return () => window.removeEventListener(NEW_WORK_ORDER_EVENT, handleRequest);
  }, [canCreate]);

  useEffect(() => {
    if (!canCreate || isMobile) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'c' && event.key !== 'C') return;
      if (event.shiftKey || shouldIgnoreNewWorkOrderShortcut(event)) return;
      event.preventDefault();
      setState({ request: {}, nonce: Date.now() });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canCreate, isMobile]);

  if (!state) return null;

  return (
    <Suspense fallback={null}>
      <WorkOrderForm
        key={state.nonce}
        open
        onClose={() => setState(null)}
        equipmentId={state.request.equipmentId}
        initialIsHistorical={state.request.logCompleted}
        prefillTitle={state.request.title}
        prefillDescription={state.request.description}
        prefillPriority={state.request.priority}
      />
    </Suspense>
  );
};

export default GlobalWorkOrderLauncher;
