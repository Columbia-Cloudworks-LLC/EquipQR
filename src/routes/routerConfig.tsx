import QrPageLoadingShell from '@/features/equipment/components/qr/QrPageLoadingShell';

export const routerFutureFlags = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
} as const;

export const qrRouteFallback = <QrPageLoadingShell />;

export const textRouteFallback = <div>Loading...</div>;
